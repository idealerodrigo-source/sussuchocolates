"""
NFC-e routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from database import db
from auth import get_current_user
from models import NFCe

# Import NFC-e service
from nfce_service import (
    verificar_certificado,
    status_servico_sefaz,
    emitir_nfce as nfce_emitir_real,
    cancelar_nfce,
    NFCeEmissao,
    ItemNFCe,
    DadosClienteNFCe,
    HOMOLOGACAO
)

router = APIRouter(prefix="/nfce", tags=["nfce"])


@router.get("/configuracao")
async def nfce_configuracao(current_user: dict = Depends(get_current_user)):
    """Retorna configuração e status do módulo NFC-e"""
    cert_info = verificar_certificado()
    return {
        "certificado": cert_info,
        "ambiente": "Homologação" if HOMOLOGACAO else "Produção",
        "uf": "PR",
        "configurado": cert_info.get("valido", False)
    }


@router.get("/status-sefaz")
async def nfce_status_sefaz(current_user: dict = Depends(get_current_user)):
    """Consulta status do serviço da SEFAZ"""
    return status_servico_sefaz()


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


@router.post("/emitir")
async def nfce_emitir(dados: dict, current_user: dict = Depends(get_current_user)):
    """Emite uma NFC-e via SEFAZ"""
    try:
        items = [ItemNFCe(**item) for item in dados.get('items', [])]
        
        cliente = None
        if dados.get('cliente'):
            cliente = DadosClienteNFCe(**dados['cliente'])
        
        emissao = NFCeEmissao(
            venda_id=dados.get('venda_id'),
            cliente=cliente,
            items=items,
            valor_produtos=dados.get('valor_produtos', 0),
            valor_desconto=dados.get('valor_desconto', 0),
            valor_total=dados.get('valor_total', 0),
            forma_pagamento=dados.get('forma_pagamento', '01'),
            valor_pago=dados.get('valor_pago', 0),
            valor_troco=dados.get('valor_troco', 0)
        )
        
        resultado = nfce_emitir_real(emissao)
        
        if resultado.success:
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
                "qrcode_url": resultado.qrcode_url
            }
            await db.nfce.insert_one(nfce_doc)
            
            if emissao.venda_id:
                await db.vendas.update_one(
                    {"id": emissao.venda_id},
                    {"$set": {
                        "nfce_emitida": True,
                        "nfce_chave": resultado.chave_acesso,
                        "nfce_numero": resultado.numero_nfce
                    }}
                )
        
        return resultado.model_dump()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancelar/{chave_acesso}")
async def nfce_cancelar_endpoint(chave_acesso: str, justificativa: str, current_user: dict = Depends(get_current_user)):
    """Cancela uma NFC-e"""
    resultado = cancelar_nfce(chave_acesso, justificativa)
    
    if resultado.get('success'):
        await db.nfce.update_one(
            {"chave_acesso": chave_acesso},
            {"$set": {"status": "cancelada", "data_cancelamento": datetime.now(timezone.utc).isoformat()}}
        )
    
    return resultado


@router.get("/{nfce_id}", response_model=NFCe)
async def obter_nfce(nfce_id: str, current_user: dict = Depends(get_current_user)):
    nfce = await db.nfce.find_one({"id": nfce_id}, {"_id": 0})
    if not nfce:
        raise HTTPException(status_code=404, detail="NFC-e não encontrada")
    if isinstance(nfce['data_emissao'], str):
        nfce['data_emissao'] = datetime.fromisoformat(nfce['data_emissao'])
    return nfce


@router.get("", response_model=List[NFCe])
async def listar_nfce(current_user: dict = Depends(get_current_user)):
    nfces = await db.nfce.find({}, {"_id": 0}).sort("data_emissao", -1).to_list(1000)
    for n in nfces:
        if isinstance(n['data_emissao'], str):
            n['data_emissao'] = datetime.fromisoformat(n['data_emissao'])
    return nfces
