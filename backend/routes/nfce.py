"""
NFC-e routes — Integração SEFAZ-PR
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from database import db
from auth import get_current_user
from nfce_service import (
    verificar_certificado,
    verificar_configuracao,
    status_sefaz,
    emitir_nfce,
    cancelar_nfce,
    EmissaoNFCe,
    ItemNFCe,
    PagamentoNFCe,
    ClienteNFCe,
    HOMOLOGACAO,
    _forma_pagamento_codigo,
)

router = APIRouter(prefix="/nfce", tags=["nfce"])


# ===== STATUS E CONFIGURAÇÃO =====

@router.get("/configuracao")
async def nfce_configuracao(current_user: dict = Depends(get_current_user)):
    """Retorna configuração e status do módulo NFC-e"""
    cfg = verificar_configuracao()
    cert = verificar_certificado()
    return {
        **cfg,
        "certificado": cert,
        "ambiente": "Homologação" if HOMOLOGACAO else "Produção",
    }


@router.get("/status-sefaz")
async def nfce_status(current_user: dict = Depends(get_current_user)):
    """Consulta status do webservice da SEFAZ-PR"""
    return await status_sefaz()


# ===== EMISSÃO =====

@router.post("/emitir")
async def nfce_emitir(dados: dict, current_user: dict = Depends(get_current_user)):
    """
    Emite NFC-e via SEFAZ-PR.
    Recebe os dados da venda e transmite para autorização.
    """
    try:
        # Montar itens
        items = []
        for i, item in enumerate(dados.get('items', []), 1):
            items.append(ItemNFCe(
                codigo=item.get('produto_id', str(i).zfill(6))[:60],
                descricao=item.get('produto_nome', 'PRODUTO')[:120],
                ncm=item.get('ncm', '18069000'),
                cfop=item.get('cfop', '5102'),
                unidade=item.get('unidade', 'UN'),
                quantidade=float(item.get('quantidade', 1)),
                valor_unitario=float(item.get('preco_unitario', 0)),
                valor_total=float(item.get('subtotal', 0)),
            ))

        # Montar pagamentos
        pagamentos = []
        formas = dados.get('formas_pagamento') or []
        if formas:
            for fp in formas:
                pagamentos.append(PagamentoNFCe(
                    forma=_forma_pagamento_codigo(fp.get('tipo', 'Outros')),
                    valor=float(fp.get('valor', 0)),
                ))
        else:
            forma_str = dados.get('forma_pagamento', 'Outros')
            pagamentos.append(PagamentoNFCe(
                forma=_forma_pagamento_codigo(forma_str),
                valor=float(dados.get('valor_total', 0)),
            ))

        # Cliente
        cliente = None
        if dados.get('cliente_cpf') or dados.get('cliente_nome'):
            cliente = ClienteNFCe(
                cpf=dados.get('cliente_cpf'),
                nome=dados.get('cliente_nome'),
            )

        emissao = EmissaoNFCe(
            venda_id=dados.get('venda_id'),
            cliente=cliente,
            items=items,
            valor_produtos=float(dados.get('valor_produtos') or dados.get('valor_total', 0)),
            valor_desconto=float(dados.get('valor_desconto', 0)),
            valor_total=float(dados.get('valor_total', 0)),
            pagamentos=pagamentos,
        )

        resultado = await emitir_nfce(emissao, db)

        if resultado.sucesso:
            # Registrar no banco
            nfce_doc = {
                "id": emissao.id,
                "venda_id": emissao.venda_id,
                "chave_acesso": resultado.chave_acesso,
                "numero_nfce": resultado.numero_nfce,
                "protocolo": resultado.protocolo,
                "data_autorizacao": resultado.data_autorizacao,
                "data_emissao": datetime.now(timezone.utc).isoformat(),
                "valor_total": emissao.valor_total,
                "status": "autorizada",
                "ambiente": "homologacao" if HOMOLOGACAO else "producao",
                "qrcode_url": resultado.qrcode_url,
            }
            await db.nfce.insert_one({**nfce_doc, "_id": emissao.id})

            # Atualizar venda vinculada
            if emissao.venda_id:
                await db.vendas.update_one(
                    {"id": emissao.venda_id},
                    {"$set": {
                        "nfce_emitida": True,
                        "nfce_chave": resultado.chave_acesso,
                        "nfce_numero": resultado.numero_nfce,
                        "nfce_protocolo": resultado.protocolo,
                        "nfce_qrcode": resultado.qrcode_url,
                    }}
                )

        return resultado.model_dump()

    except Exception as e:
        import traceback
        raise HTTPException(status_code=400, detail=f"Erro: {str(e)}\n{traceback.format_exc()}")


# ===== EMISSÃO A PARTIR DE UMA VENDA JÁ REGISTRADA =====

@router.post("/emitir-venda/{venda_id}")
async def nfce_emitir_da_venda(venda_id: str, current_user: dict = Depends(get_current_user)):
    """Emite NFC-e buscando os dados diretamente da venda no banco"""
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    if venda.get("nfce_emitida"):
        raise HTTPException(status_code=400, detail=f"NFC-e já emitida para esta venda (chave: {venda.get('nfce_chave', '')})")
    if venda.get("status_venda") == "cancelada":
        raise HTTPException(status_code=400, detail="Não é possível emitir NFC-e para venda cancelada")

    # Enriquecer dados com cliente se tiver
    cliente_dados = None
    if venda.get("cliente_id"):
        cli = await db.clientes.find_one({"id": venda["cliente_id"]}, {"_id": 0})
        if cli and cli.get("cpf_cnpj"):
            cliente_dados = {"cliente_cpf": cli.get("cpf_cnpj"), "cliente_nome": cli.get("nome")}

    dados = {
        "venda_id": venda_id,
        "items": venda.get("items", []),
        "valor_produtos": venda.get("subtotal") or venda.get("valor_total", 0),
        "valor_desconto": venda.get("valor_desconto", 0),
        "valor_total": venda.get("valor_total", 0),
        "formas_pagamento": venda.get("formas_pagamento"),
        "forma_pagamento": venda.get("forma_pagamento"),
        **(cliente_dados or {}),
    }
    return await nfce_emitir(dados, current_user)


# ===== CANCELAMENTO =====

@router.post("/cancelar/{chave_acesso}")
async def nfce_cancelar(
    chave_acesso: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Cancela NFC-e autorizada"""
    justificativa = body.get("justificativa", "")
    resultado = await cancelar_nfce(chave_acesso, justificativa, db)
    if resultado.get("sucesso"):
        await db.nfce.update_one(
            {"chave_acesso": chave_acesso},
            {"$set": {"status": "cancelada", "data_cancelamento": datetime.now(timezone.utc).isoformat()}}
        )
        # Atualizar venda
        nfce_doc = await db.nfce.find_one({"chave_acesso": chave_acesso}, {"_id": 0})
        if nfce_doc and nfce_doc.get("venda_id"):
            await db.vendas.update_one(
                {"id": nfce_doc["venda_id"]},
                {"$set": {"nfce_emitida": False, "nfce_cancelada": True}}
            )
    return resultado


# ===== HISTÓRICO =====

@router.get("/historico")
async def nfce_historico(
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Lista histórico de NFC-e emitidas"""
    nfces = await db.nfce.find({}, {"_id": 0}).sort("data_emissao", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.nfce.count_documents({})
    return {"items": nfces, "total": total}
