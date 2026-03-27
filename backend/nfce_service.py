"""
Módulo de NFC-e (Nota Fiscal de Consumidor Eletrônica)
Integração com SEFAZ-PR para emissão de cupons fiscais
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid

# Configurações do certificado
CERTIFICADO_PATH = os.path.join(os.path.dirname(__file__), 'certificates', 'certificado.pfx')
CERTIFICADO_SENHA = os.environ.get('CERTIFICADO_SENHA', 'Aei#0493')

# Configurações da NFC-e
UF = 'PR'  # Paraná
CNPJ_EMITENTE = '09328682000130'  # CNPJ da empresa
CSC_ID = os.environ.get('CSC_ID', '')  # ID do CSC fornecido pela SEFAZ
CSC_TOKEN = os.environ.get('CSC_TOKEN', '')  # Token do CSC

# Ambiente: True = Homologação (testes), False = Produção
HOMOLOGACAO = os.environ.get('NFCE_AMBIENTE', 'homologacao') == 'homologacao'

logger = logging.getLogger(__name__)


class ItemNFCe(BaseModel):
    """Item da NFC-e"""
    codigo: str
    descricao: str
    ncm: str = "00000000"
    cfop: str = "5102"
    unidade: str = "UN"
    quantidade: float
    valor_unitario: float
    valor_total: float
    
    # Tributação
    cst_icms: str = "00"  # CST do ICMS
    aliquota_icms: float = 0.0
    valor_icms: float = 0.0


class DadosClienteNFCe(BaseModel):
    """Dados do cliente (opcional na NFC-e)"""
    cpf: Optional[str] = None
    nome: Optional[str] = None


class NFCeEmissao(BaseModel):
    """Dados para emissão da NFC-e"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venda_id: Optional[str] = None
    cliente: Optional[DadosClienteNFCe] = None
    items: List[ItemNFCe]
    
    # Totais
    valor_produtos: float
    valor_desconto: float = 0.0
    valor_total: float
    
    # Pagamento
    forma_pagamento: str = "01"  # 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, 04=Cartão Débito, 05=Crédito Loja
    valor_pago: float = 0.0
    valor_troco: float = 0.0


class NFCeResponse(BaseModel):
    """Resposta da emissão de NFC-e"""
    success: bool
    message: str
    chave_acesso: Optional[str] = None
    numero_nfce: Optional[str] = None
    protocolo: Optional[str] = None
    data_autorizacao: Optional[str] = None
    qrcode_url: Optional[str] = None
    xml_autorizado: Optional[str] = None
    danfe_url: Optional[str] = None


def verificar_certificado():
    """Verifica se o certificado está configurado corretamente"""
    if not os.path.exists(CERTIFICADO_PATH):
        return {"valido": False, "mensagem": "Certificado não encontrado"}
    
    try:
        from cryptography.hazmat.primitives.serialization import pkcs12
        from cryptography import x509
        
        with open(CERTIFICADO_PATH, 'rb') as f:
            pfx_data = f.read()
        
        # Carregar o certificado PKCS12
        private_key, certificate, additional_certs = pkcs12.load_key_and_certificates(
            pfx_data, 
            CERTIFICADO_SENHA.encode()
        )
        
        if certificate is None:
            return {"valido": False, "mensagem": "Certificado não encontrado no arquivo PFX"}
        
        # Extrair informações do certificado
        subject = certificate.subject
        not_after = certificate.not_valid_after_utc
        
        # Extrair CN do subject
        cn = None
        for attribute in subject:
            if attribute.oid == x509.oid.NameOID.COMMON_NAME:
                cn = attribute.value
                break
        
        return {
            "valido": True,
            "titular": cn if cn else "N/A",
            "cnpj": CNPJ_EMITENTE,
            "validade": not_after.strftime('%d/%m/%Y'),
            "vencido": datetime.now(timezone.utc) > not_after
        }
    except Exception as e:
        return {"valido": False, "mensagem": str(e)}


def status_servico_sefaz():
    """Consulta o status do serviço da SEFAZ"""
    try:
        from pynfe.processamento.comunicacao import ComunicacaoSefaz
        
        con = ComunicacaoSefaz(UF, CERTIFICADO_PATH, CERTIFICADO_SENHA, HOMOLOGACAO)
        xml = con.status_servico('nfce')
        
        # Parsear resposta
        from lxml import etree
        root = etree.fromstring(xml.content)
        
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        status = root.find('.//nfe:cStat', ns)
        motivo = root.find('.//nfe:xMotivo', ns)
        
        return {
            "online": status is not None and status.text == '107',
            "codigo": status.text if status is not None else "N/A",
            "mensagem": motivo.text if motivo is not None else "N/A",
            "ambiente": "Homologação" if HOMOLOGACAO else "Produção"
        }
    except Exception as e:
        logger.error(f"Erro ao consultar status SEFAZ: {e}")
        return {
            "online": False,
            "codigo": "ERR",
            "mensagem": str(e),
            "ambiente": "Homologação" if HOMOLOGACAO else "Produção"
        }


def emitir_nfce(dados: NFCeEmissao) -> NFCeResponse:
    """
    Emite uma NFC-e na SEFAZ
    """
    try:
        from pynfe.processamento.serializacao import SerializacaoXML
        from pynfe.processamento.assinatura import AssinaturaA1
        from pynfe.processamento.comunicacao import ComunicacaoSefaz
        from pynfe.entidades.notafiscal import NotaFiscal
        from pynfe.entidades.fonte_dados import _fonte_dados
        from lxml import etree
        
        # Verificar se CSC está configurado
        if not CSC_ID or not CSC_TOKEN:
            return NFCeResponse(
                success=False,
                message="CSC não configurado. Configure CSC_ID e CSC_TOKEN nas variáveis de ambiente."
            )
        
        # Criar nota fiscal
        # NOTA: Esta é uma implementação simplificada
        # Em produção, seria necessário configurar todos os campos obrigatórios
        
        nfce_numero = _gerar_numero_nfce()
        
        # Montar XML da NFC-e
        # ... (implementação completa do XML seria extensa)
        
        # Por enquanto, retornar resposta mockada para homologação
        if HOMOLOGACAO:
            chave = f"41{datetime.now().strftime('%y%m')}{CNPJ_EMITENTE}65001{str(nfce_numero).zfill(9)}1{str(nfce_numero).zfill(8)}0"
            
            return NFCeResponse(
                success=True,
                message="NFC-e emitida com sucesso (HOMOLOGAÇÃO)",
                chave_acesso=chave,
                numero_nfce=str(nfce_numero),
                protocolo=f"141{datetime.now().strftime('%y%m%d%H%M%S')}",
                data_autorizacao=datetime.now(timezone.utc).isoformat(),
                qrcode_url=f"https://www.sefaz.pr.gov.br/nfce/qrcode?p={chave}|2|{CSC_ID}|{CSC_TOKEN[:8]}",
                xml_autorizado=None,
                danfe_url=None
            )
        
        # Produção - implementar comunicação real com SEFAZ
        return NFCeResponse(
            success=False,
            message="Emissão em produção ainda não implementada. Configure o ambiente para homologação."
        )
        
    except Exception as e:
        logger.error(f"Erro ao emitir NFC-e: {e}")
        return NFCeResponse(
            success=False,
            message=f"Erro ao emitir NFC-e: {str(e)}"
        )


def cancelar_nfce(chave_acesso: str, justificativa: str) -> dict:
    """
    Cancela uma NFC-e já autorizada
    """
    if len(justificativa) < 15:
        return {"success": False, "message": "Justificativa deve ter no mínimo 15 caracteres"}
    
    try:
        # Em produção, implementar cancelamento via SEFAZ
        if HOMOLOGACAO:
            return {
                "success": True,
                "message": "NFC-e cancelada com sucesso (HOMOLOGAÇÃO)",
                "protocolo_cancelamento": f"141{datetime.now().strftime('%y%m%d%H%M%S')}"
            }
        
        return {"success": False, "message": "Cancelamento em produção não implementado"}
    except Exception as e:
        return {"success": False, "message": str(e)}


# Contador de NFC-e (em produção, usar sequência do banco)
_nfce_counter = 1

def _gerar_numero_nfce():
    global _nfce_counter
    _nfce_counter += 1
    return _nfce_counter
