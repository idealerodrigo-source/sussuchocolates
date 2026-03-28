"""
NF Entrada routes - Parsing e CRUD de Notas Fiscais de Entrada
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
import re
import logging

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

from database import db
from auth import get_current_user
from models import NFEntrada, NFEntradaCreate, ItemNFEntrada

router = APIRouter(prefix="/nf-entrada", tags=["nf-entrada"])


@router.post("/parse-xml")
async def parse_nf_xml(request: Request, current_user: dict = Depends(get_current_user)):
    """Parse XML da NF-e (formato nativo da Nota Fiscal Eletrônica)"""
    try:
        xml_content = await request.body()
        xml_content = xml_content.decode('utf-8').strip()
        
        if xml_content.startswith('\ufeff'):
            xml_content = xml_content[1:]
        
        if not xml_content:
            raise HTTPException(status_code=400, detail="XML vazio")
        
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as pe:
            logging.error(f"XML Parse Error: {pe}")
            raise HTTPException(status_code=400, detail=f"XML inválido: {str(pe)}")
        
        def find_elem(parent, tag_name):
            if parent is None:
                return None
            ns_url = 'http://www.portalfiscal.inf.br/nfe'
            elem = parent.find(f'.//{{{ns_url}}}{tag_name}')
            if elem is None:
                elem = parent.find(f'.//{tag_name}')
            if elem is None:
                for child in parent.iter():
                    tag = child.tag
                    if '}' in tag:
                        tag = tag.split('}')[1]
                    if tag == tag_name:
                        return child
            return elem
        
        def get_text(parent, tag_name, default=""):
            if parent is None:
                return default
            elem = find_elem(parent, tag_name)
            if elem is not None and elem.text:
                return elem.text.strip()
            return default
        
        def get_attr(elem, attr_name, default=""):
            if elem is None:
                return default
            return elem.get(attr_name, default)
        
        chave_acesso = ""
        infNFe = find_elem(root, 'infNFe')
        if infNFe is not None:
            chave_acesso = get_attr(infNFe, 'Id', '').replace('NFe', '')
        
        ide = find_elem(root, 'ide')
        numero_nf = get_text(ide, 'nNF') if ide is not None else ""
        serie = get_text(ide, 'serie') if ide is not None else ""
        data_emissao_raw = get_text(ide, 'dhEmi') if ide is not None else ""
        
        data_emissao = ""
        if data_emissao_raw:
            try:
                data_emissao = data_emissao_raw.split('T')[0]
            except:
                data_emissao = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        emit = find_elem(root, 'emit')
        fornecedor_cnpj = get_text(emit, 'CNPJ') if emit is not None else ""
        fornecedor_nome = get_text(emit, 'xNome') if emit is not None else ""
        fornecedor_ie = get_text(emit, 'IE') if emit is not None else ""
        
        enderEmit = find_elem(emit, 'enderEmit') if emit is not None else None
        fornecedor_endereco = ""
        fornecedor_municipio = ""
        fornecedor_uf = ""
        fornecedor_cep = ""
        fornecedor_telefone = ""
        
        if enderEmit is not None:
            logradouro = get_text(enderEmit, 'xLgr')
            numero = get_text(enderEmit, 'nro')
            complemento = get_text(enderEmit, 'xCpl')
            bairro = get_text(enderEmit, 'xBairro')
            
            partes_end = [logradouro]
            if numero:
                partes_end.append(f"nº {numero}")
            if complemento:
                partes_end.append(complemento)
            if bairro:
                partes_end.append(bairro)
            fornecedor_endereco = ", ".join(partes_end)
            
            fornecedor_municipio = get_text(enderEmit, 'xMun')
            fornecedor_uf = get_text(enderEmit, 'UF')
            fornecedor_cep = get_text(enderEmit, 'CEP')
            fornecedor_telefone = get_text(enderEmit, 'fone')
        
        items = []
        for elem in root.iter():
            if elem.tag.endswith('det'):
                prod = find_elem(elem, 'prod')
                imposto = find_elem(elem, 'imposto')
                
                if prod is not None:
                    item = {
                        "codigo": get_text(prod, 'cProd'),
                        "descricao": get_text(prod, 'xProd'),
                        "ncm": get_text(prod, 'NCM'),
                        "cfop": get_text(prod, 'CFOP'),
                        "unidade": get_text(prod, 'uCom', 'UN'),
                        "quantidade": float(get_text(prod, 'qCom', '0').replace(',', '.')),
                        "valor_unitario": float(get_text(prod, 'vUnCom', '0').replace(',', '.')),
                        "valor_total": float(get_text(prod, 'vProd', '0').replace(',', '.')),
                        "valor_desconto": float(get_text(prod, 'vDesc', '0').replace(',', '.')),
                        "cst": "",
                        "icms_base": 0.0,
                        "icms_valor": 0.0,
                        "ipi_valor": 0.0,
                        "pis_valor": 0.0,
                        "cofins_valor": 0.0
                    }
                    
                    if imposto is not None:
                        icms_elem = find_elem(imposto, 'ICMS')
                        if icms_elem is not None:
                            for icms_type in icms_elem:
                                item['cst'] = get_text(icms_type, 'CST') or get_text(icms_type, 'CSOSN')
                                item['icms_base'] = float(get_text(icms_type, 'vBC', '0').replace(',', '.'))
                                item['icms_valor'] = float(get_text(icms_type, 'vICMS', '0').replace(',', '.'))
                                break
                        
                        ipi_elem = find_elem(imposto, 'IPI')
                        if ipi_elem is not None:
                            item['ipi_valor'] = float(get_text(ipi_elem, 'vIPI', '0').replace(',', '.'))
                        
                        pis_elem = find_elem(imposto, 'PIS')
                        if pis_elem is not None:
                            item['pis_valor'] = float(get_text(pis_elem, 'vPIS', '0').replace(',', '.'))
                        
                        cofins_elem = find_elem(imposto, 'COFINS')
                        if cofins_elem is not None:
                            item['cofins_valor'] = float(get_text(cofins_elem, 'vCOFINS', '0').replace(',', '.'))
                    
                    items.append(item)
        
        icmsTot = find_elem(root, 'ICMSTot')
        valor_produtos = float(get_text(icmsTot, 'vProd', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_frete = float(get_text(icmsTot, 'vFrete', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_seguro = float(get_text(icmsTot, 'vSeg', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_outras = float(get_text(icmsTot, 'vOutro', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_desconto = float(get_text(icmsTot, 'vDesc', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_ipi = float(get_text(icmsTot, 'vIPI', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_icms = float(get_text(icmsTot, 'vICMS', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_pis = float(get_text(icmsTot, 'vPIS', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_cofins = float(get_text(icmsTot, 'vCOFINS', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_total = float(get_text(icmsTot, 'vNF', '0').replace(',', '.')) if icmsTot is not None else 0.0
        
        infAdic = find_elem(root, 'infAdic')
        info_complementares = get_text(infAdic, 'infCpl') if infAdic is not None else ""
        
        return {
            "success": True,
            "source": "xml",
            "data": {
                "chave_acesso": chave_acesso,
                "numero_nf": numero_nf,
                "serie": serie,
                "data_emissao": data_emissao,
                "fornecedor_cnpj": fornecedor_cnpj,
                "fornecedor_nome": fornecedor_nome,
                "fornecedor_ie": fornecedor_ie,
                "fornecedor_endereco": fornecedor_endereco,
                "fornecedor_municipio": fornecedor_municipio,
                "fornecedor_uf": fornecedor_uf,
                "fornecedor_cep": fornecedor_cep,
                "fornecedor_telefone": fornecedor_telefone,
                "items": items,
                "valor_produtos": valor_produtos,
                "valor_frete": valor_frete,
                "valor_seguro": valor_seguro,
                "valor_outras": valor_outras,
                "valor_desconto": valor_desconto,
                "valor_ipi": valor_ipi,
                "valor_icms": valor_icms,
                "valor_pis": valor_pis,
                "valor_cofins": valor_cofins,
                "valor_total": valor_total,
                "informacoes_complementares": info_complementares
            }
        }
    except ET.ParseError as e:
        logging.error(f"Erro ao parsear XML da NF-e: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar XML: formato inválido")
    except Exception as e:
        logging.error(f"Erro ao parsear XML da NF-e: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar XML: {str(e)}")


@router.get("")
async def listar_nf_entrada(current_user: dict = Depends(get_current_user)):
    nfs = await db.nf_entrada.find({}, {"_id": 0}).sort("data_entrada", -1).to_list(1000)
    for nf in nfs:
        if isinstance(nf.get('data_emissao'), str):
            nf['data_emissao'] = datetime.fromisoformat(nf['data_emissao'])
        if isinstance(nf.get('data_entrada'), str):
            nf['data_entrada'] = datetime.fromisoformat(nf['data_entrada'])
    return nfs


@router.post("")
async def criar_nf_entrada(nf_data: NFEntradaCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.nf_entrada.find_one({"chave_acesso": nf_data.chave_acesso}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="NF-e já registrada com essa chave de acesso")
    
    nf = NFEntrada(
        chave_acesso=nf_data.chave_acesso,
        numero_nf=nf_data.numero_nf,
        serie=nf_data.serie,
        data_emissao=datetime.fromisoformat(nf_data.data_emissao),
        fornecedor_cnpj=nf_data.fornecedor_cnpj,
        fornecedor_nome=nf_data.fornecedor_nome,
        fornecedor_ie=nf_data.fornecedor_ie,
        fornecedor_endereco=nf_data.fornecedor_endereco,
        fornecedor_municipio=nf_data.fornecedor_municipio,
        fornecedor_uf=nf_data.fornecedor_uf,
        fornecedor_cep=nf_data.fornecedor_cep,
        fornecedor_telefone=nf_data.fornecedor_telefone,
        items=[ItemNFEntrada(**item.model_dump()) for item in nf_data.items],
        valor_produtos=nf_data.valor_produtos,
        valor_frete=nf_data.valor_frete,
        valor_seguro=nf_data.valor_seguro,
        valor_outras=nf_data.valor_outras,
        valor_desconto=nf_data.valor_desconto,
        valor_ipi=nf_data.valor_ipi,
        valor_icms=nf_data.valor_icms,
        valor_pis=nf_data.valor_pis,
        valor_cofins=nf_data.valor_cofins,
        valor_total=nf_data.valor_total,
        informacoes_complementares=nf_data.informacoes_complementares,
        observacoes=nf_data.observacoes
    )
    
    doc = nf.model_dump()
    doc['data_emissao'] = doc['data_emissao'].isoformat()
    doc['data_entrada'] = doc['data_entrada'].isoformat()
    await db.nf_entrada.insert_one(doc)
    
    return {"message": "NF-e registrada com sucesso", "id": nf.id}


@router.post("/parse-chave")
async def parse_chave_acesso(chave: str, current_user: dict = Depends(get_current_user)):
    """Extrai informações básicas da chave de acesso da NF-e (44 dígitos)"""
    chave = chave.replace(' ', '').replace('.', '').replace('-', '')
    
    if len(chave) != 44 or not chave.isdigit():
        raise HTTPException(status_code=400, detail="Chave de acesso inválida. Deve conter 44 dígitos numéricos.")
    
    existing = await db.nf_entrada.find_one({"chave_acesso": chave}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="NF-e já registrada com essa chave de acesso")
    
    uf = chave[0:2]
    ano_mes = chave[2:6]
    cnpj = chave[6:20]
    modelo = chave[20:22]
    serie = chave[22:25]
    numero = chave[25:34]
    
    cnpj_formatado = f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:14]}"
    
    ano = f"20{ano_mes[:2]}"
    mes = ano_mes[2:4]
    data_emissao = f"{ano}-{mes}-01"
    
    numero_nf = str(int(numero))
    serie_nf = str(int(serie))
    
    return {
        "success": True,
        "data": {
            "chave_acesso": chave,
            "uf": uf,
            "cnpj": cnpj,
            "cnpj_formatado": cnpj_formatado,
            "modelo": modelo,
            "serie": serie_nf,
            "numero_nf": numero_nf,
            "data_emissao": data_emissao,
        }
    }


@router.delete("/{nf_id}")
async def deletar_nf_entrada(nf_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.nf_entrada.delete_one({"id": nf_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="NF-e não encontrada")
    return {"message": "NF-e removida com sucesso"}
