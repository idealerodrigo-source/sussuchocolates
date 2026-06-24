"""
Módulo de NFC-e (Nota Fiscal de Consumidor Eletrônica) - Modelo 65
Integração com SEFAZ-PR via pynfe
"""
import os
import logging
import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid

logger = logging.getLogger(__name__)

# ===== CONFIGURAÇÕES =====
CERT_SENHA = os.environ.get('CERTIFICADO_SENHA', '')
CSC_ID = os.environ.get('CSC_ID', '')
CSC_TOKEN = os.environ.get('CSC_TOKEN', '')
IE_EMITENTE = os.environ.get('IE_EMITENTE', '9042901730')
CNPJ_EMITENTE = '09328682000130'
HOMOLOGACAO = os.environ.get('NFCE_AMBIENTE', 'homologacao') == 'homologacao'
UF = 'PR'
COD_IBGE_MUNICIPIO = '4112207'  # Jacarezinho/PR
NOME_MUNICIPIO = 'Jacarezinho'
SERIE_NFCE = '1'

# Caminho do certificado — carregado de variável de ambiente (base64) ou arquivo
_CERT_PATH_DEFAULT = os.path.join(os.path.dirname(__file__), 'certificates', 'certificado.pfx')

def _get_cert_path() -> str:
    """Retorna caminho para o certificado. Se CERTIFICADO_BASE64 estiver definido,
    decodifica e salva em arquivo temporário."""
    b64 = os.environ.get('CERTIFICADO_BASE64', '')
    if b64:
        import base64, tempfile
        tmp = os.path.join(tempfile.gettempdir(), 'sussu_cert.pfx')
        if not os.path.exists(tmp):
            with open(tmp, 'wb') as f:
                f.write(base64.b64decode(b64))
        return tmp
    return _CERT_PATH_DEFAULT

CERT_PATH = _get_cert_path()


# ===== MODELOS =====
class ItemNFCe(BaseModel):
    codigo: str
    descricao: str
    ncm: str = "18069000"       # Chocolates e preparações alimentícias com cacau
    cfop: str = "5102"          # Venda de mercadoria adquirida/recebida de terceiros
    unidade: str = "UN"
    quantidade: float
    valor_unitario: float
    valor_total: float
    # ICMS - Simples Nacional (CSOSN 400 = não tributado pelo SN)
    cst_icms: str = "400"       # Tributado pelo SIMPLES NACIONAL sem permissão de crédito
    # PIS/COFINS
    cst_pis: str = "07"         # Operação isenta da contribuição
    cst_cofins: str = "07"


class PagamentoNFCe(BaseModel):
    forma: str = "01"           # 01=Dinheiro, 03=Cartão Crédito, 04=Cartão Débito, 99=Outros
    valor: float
    troco: float = 0.0


class ClienteNFCe(BaseModel):
    cpf: Optional[str] = None
    nome: Optional[str] = None


class EmissaoNFCe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venda_id: Optional[str] = None
    cliente: Optional[ClienteNFCe] = None
    items: List[ItemNFCe]
    valor_produtos: float
    valor_desconto: float = 0.0
    valor_total: float
    pagamentos: List[PagamentoNFCe]
    numero_nf: Optional[str] = None  # Preenchido automaticamente


class RespostaNFCe(BaseModel):
    sucesso: bool
    mensagem: str
    chave_acesso: Optional[str] = None
    numero_nfce: Optional[str] = None
    protocolo: Optional[str] = None
    data_autorizacao: Optional[str] = None
    qrcode_url: Optional[str] = None
    xml_autorizado: Optional[str] = None


# ===== FUNÇÕES AUXILIARES =====
def _so_numeros(texto: str) -> str:
    return ''.join(filter(str.isdigit, str(texto)))


def verificar_certificado() -> dict:
    """Verifica validade do certificado A1"""
    if not os.path.exists(CERT_PATH):
        return {"valido": False, "mensagem": "Certificado não encontrado em certificates/certificado.pfx"}
    if not CERT_SENHA:
        return {"valido": False, "mensagem": "CERTIFICADO_SENHA não configurada nas variáveis de ambiente"}
    try:
        from cryptography.hazmat.primitives.serialization import pkcs12
        from cryptography import x509
        with open(CERT_PATH, 'rb') as f:
            pfx_data = f.read()
        pk, cert, _ = pkcs12.load_key_and_certificates(pfx_data, CERT_SENHA.encode())
        if cert is None:
            return {"valido": False, "mensagem": "Certificado inválido"}
        not_after = cert.not_valid_after_utc
        cn = None
        for attr in cert.subject:
            if attr.oid == x509.oid.NameOID.COMMON_NAME:
                cn = attr.value
                break
        vencido = datetime.now(timezone.utc) > not_after
        return {
            "valido": not vencido,
            "titular": cn or "N/A",
            "cnpj": CNPJ_EMITENTE,
            "validade": not_after.strftime('%d/%m/%Y'),
            "vencido": vencido,
            "ambiente": "Homologação" if HOMOLOGACAO else "Produção",
        }
    except Exception as e:
        return {"valido": False, "mensagem": f"Erro ao ler certificado: {e}"}


def verificar_configuracao() -> dict:
    """Verifica se todas as variáveis obrigatórias estão configuradas"""
    problemas = []
    if not CERT_SENHA:
        problemas.append("CERTIFICADO_SENHA não configurada")
    if not CSC_ID:
        problemas.append("CSC_ID não configurado")
    if not CSC_TOKEN:
        problemas.append("CSC_TOKEN não configurado")
    if not IE_EMITENTE:
        problemas.append("IE_EMITENTE não configurada")
    if not os.path.exists(CERT_PATH):
        problemas.append("certificates/certificado.pfx não encontrado")
    return {
        "configurado": len(problemas) == 0,
        "problemas": problemas,
        "ambiente": "Homologação" if HOMOLOGACAO else "Produção",
        "cnpj": CNPJ_EMITENTE,
        "ie": IE_EMITENTE,
    }


async def status_sefaz() -> dict:
    """Consulta status do webservice da SEFAZ-PR"""
    cfg = verificar_configuracao()
    if not cfg["configurado"]:
        return {"online": False, "mensagem": "Configuração incompleta: " + ", ".join(cfg["problemas"])}
    try:
        from pynfe.processamento.comunicacao import ComunicacaoSefaz
        con = ComunicacaoSefaz(UF, CERT_PATH, CERT_SENHA, HOMOLOGACAO)
        xml = con.status_servico('nfce')
        from lxml import etree
        root = etree.fromstring(xml.content)
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        status = root.find('.//nfe:cStat', ns)
        motivo = root.find('.//nfe:xMotivo', ns)
        online = status is not None and status.text == '107'
        return {
            "online": online,
            "codigo": status.text if status is not None else "N/A",
            "mensagem": motivo.text if motivo is not None else "N/A",
            "ambiente": "Homologação" if HOMOLOGACAO else "Produção",
        }
    except Exception as e:
        logger.error(f"Erro ao consultar SEFAZ: {e}")
        return {"online": False, "mensagem": str(e)}


async def _proximo_numero_nfce(db) -> int:
    """Obtém o próximo número de NFC-e sequencial do banco"""
    result = await db.configuracoes.find_one_and_update(
        {"_id": "nfce_sequencia"},
        {"$inc": {"numero": 1}},
        upsert=True,
        return_document=True,
    )
    return result.get("numero", 1)


def _forma_pagamento_codigo(forma: str) -> str:
    """Mapeia forma de pagamento do sistema para código NFC-e"""
    mapa = {
        "Dinheiro": "01",
        "PIX": "17",
        "Cartão de Crédito": "03",
        "Cartão de Débito": "04",
        "Cheque": "02",
        "Transferência": "15",
        "Outros": "99",
    }
    for k, v in mapa.items():
        if k.lower() in forma.lower():
            return v
    return "99"


async def emitir_nfce(dados: EmissaoNFCe, db=None) -> RespostaNFCe:
    """
    Emite NFC-e na SEFAZ-PR usando pynfe.
    """
    cfg = verificar_configuracao()
    if not cfg["configurado"]:
        return RespostaNFCe(
            sucesso=False,
            mensagem="Configuração incompleta: " + ", ".join(cfg["problemas"])
        )

    try:
        from pynfe.entidades.notafiscal import NotaFiscal
        from pynfe.entidades.emitente import Emitente
        from pynfe.entidades.cliente import Cliente
        from pynfe.entidades.fonte_dados import _fonte_dados
        from pynfe.processamento.serializacao import SerializacaoXML
        from pynfe.processamento.assinatura import AssinaturaA1
        from pynfe.processamento.comunicacao import ComunicacaoSefaz
        from lxml import etree
        import hashlib, hmac

        # Constantes NFC-e (valores numéricos diretos — independente da versão do pynfe)
        MODELO_NFCE = 65
        TIPO_SAIDA = 1
        TIPO_IMPRESSAO_NFCE = 4
        FORMA_EMISSAO_NORMAL = 1
        FINALIDADE_NORMAL = 1
        CLIENTE_FINAL = 1
        PRESENCIAL = 1
        DESTINO_INTERNO = 1

        fonte = _fonte_dados

        # === EMITENTE ===
        ie_emitente = os.environ.get('IE_EMITENTE', '9042901730')
        emitente = Emitente()
        emitente.cnpj = CNPJ_EMITENTE
        emitente.inscricao_estadual = ie_emitente
        emitente.razao_social = "09.328.682 SUZETE CANDIDO XAVIER"
        emitente.nome_fantasia = "Sussu Chocolates"
        emitente.endereco_logradouro = "Rua Quintino Bocaiuva"
        emitente.endereco_numero = "737"
        emitente.endereco_complemento = ""
        emitente.endereco_bairro = "Centro"
        emitente.endereco_municipio = NOME_MUNICIPIO
        emitente.endereco_uf = UF
        emitente.endereco_cep = "86400000"
        emitente.endereco_pais = "1058"
        emitente.endereco_telefone = "43999676206"
        emitente.codigo_de_regime_tributario = "1"  # Simples Nacional

        # === DESTINATÁRIO (opcional em NFC-e) ===
        # Para NFC-e sem identificação, omitir o dest completamente
        if dados.cliente and dados.cliente.cpf and len(_so_numeros(dados.cliente.cpf)) == 11:
            cliente = Cliente()
            cliente.tipo_documento = "CPF"
            cliente.numero_documento = _so_numeros(dados.cliente.cpf)
            cliente.razao_social = dados.cliente.nome or "CONSUMIDOR"
            cliente.inscricao_estadual = "ISENTO"
            cliente.isento_icms = True
            cliente.indicador_ie = 9
            cliente.email = ""
            cliente.endereco_logradouro = "NAO INFORMADO"
            cliente.endereco_numero = "0"
            cliente.endereco_complemento = ""
            cliente.endereco_bairro = "NAO INFORMADO"
            cliente.endereco_municipio = NOME_MUNICIPIO
            cliente.endereco_uf = UF
            cliente.endereco_cep = "86400000"
            cliente.endereco_pais = "1058"
            cliente.endereco_telefone = ""
        else:
            cliente = None  # sem identificação — dest omitido na NFC-e

        # === NÚMERO DA NFC-e ===
        if db is not None:
            numero_nf = await _proximo_numero_nfce(db)
        else:
            numero_nf = int(datetime.now().strftime('%H%M%S'))

        # === NOTA FISCAL ===
        nf = NotaFiscal()
        nf.emitente = emitente
        nf.cliente = cliente  # None = sem dest (consumidor anônimo)
        nf.fonte_dados = fonte
        nf.modelo = MODELO_NFCE          # 65
        nf.serie = SERIE_NFCE
        nf.numero_nf = str(numero_nf)  # sem zeros à esquerda (padrão TNF SEFAZ)
        nf.data_emissao = datetime.now(timezone.utc)
        nf.data_saida_entrada = datetime.now(timezone.utc)
        nf.natureza_operacao = "VENDA AO CONSUMIDOR"
        nf.tipo_documento = 1    # 1 = Saída
        nf.tipo_impressao_danfe = 4  # 4 = NFC-e
        nf.forma_emissao = 1     # 1 = Normal
        nf.finalidade_emissao = 1  # 1 = Normal
        nf.cliente_final = 1     # 1 = Sim
        nf.indicador_presencial = 1  # 1 = Presencial
        nf.indicador_destino = 1    # 1 = Operação interna
        nf.uf = UF
        nf.municipio = COD_IBGE_MUNICIPIO
        nf.processo_emissao = "0"
        nf.indicador_intermediador = "0"
        nf.modalidade_frete = 9          # fallback
        nf.transporte_modalidade_frete = 9  # 9 = Sem frete (obrigatório NFC-e)
        nf.informacoes_complementares = "Documento emitido por ME ou EPP optante pelo Simples Nacional"

        # === RESPONSÁVEL TÉCNICO (NT 2018/003) ===
        # Karo & Figli Ltda — empresa desenvolvedora do sistema
        nf.adicionar_responsavel_tecnico(
            cnpj="29808302000172",
            contato="Karo & Figli Ltda",
            email="sussuchocolates@hotmail.com",
            fone="43999676206",
        )

        # === ITENS ===
        for i, item in enumerate(dados.items, 1):
            # Em homologação o 1º item deve ter descrição específica (obrigação SEFAZ)
            if HOMOLOGACAO and i == 1:
                descricao = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
            else:
                descricao = item.descricao[:120]
            nf.adicionar_produto_servico(
                codigo=item.codigo or str(i).zfill(6),
                descricao=descricao,
                ncm=_so_numeros(item.ncm)[:8].ljust(8, '0'),
                cfop=item.cfop,
                unidade_comercial=item.unidade,
                quantidade_comercial=Decimal(str(item.quantidade)),
                valor_unitario_comercial=Decimal(str(round(item.valor_unitario, 10))),
                valor_unitario_tributavel=Decimal(str(round(item.valor_unitario, 10))),
                unidade_tributavel=item.unidade,
                quantidade_tributavel=Decimal(str(item.quantidade)),
                valor_total_bruto=Decimal(str(round(item.valor_total, 2))),
                numero_item=i,
                ind_total=1,
                compoe_valor_total=1,
                valor_tributos_aprox=Decimal("0.00"),
                informacoes_adicionais="",
                desconto=Decimal("0.00"),
                total_frete=Decimal("0.00"),
                total_seguro=Decimal("0.00"),
                outras_despesas_acessorias=Decimal("0.00"),
                ean="SEM GTIN",
                ean_tributavel="SEM GTIN",
                cest="",
                cbenef="",
                # ICMS Simples Nacional
                icms_modalidade=item.cst_icms,
                icms_csosn=item.cst_icms,
                icms_origem="0",
                # PIS/COFINS
                pis_modalidade=item.cst_pis,
                pis_valor_base_calculo=Decimal("0.00"),
                pis_aliquota_percentual=Decimal("0.00"),
                pis_valor_pis=Decimal("0.00"),
                cofins_modalidade=item.cst_cofins,
                cofins_valor_base_calculo=Decimal("0.00"),
                cofins_aliquota_percentual=Decimal("0.00"),
                cofins_valor_cofins=Decimal("0.00"),
            )

        # === PAGAMENTOS ===
        valor_troco_total = Decimal("0.00")
        total_pagamentos = Decimal("0.00")
        for pag in dados.pagamentos:
            v = Decimal(str(round(pag.valor, 2)))
            nf.adicionar_pagamento(
                t_pag=pag.forma,
                v_pag=v,
                ind_pag="0",  # 0=à Vista
            )
            if pag.troco:
                valor_troco_total += Decimal(str(round(pag.troco, 2)))
            total_pagamentos += v

        # Garantir que total de pagamentos == valor total da NF (obrigatório SEFAZ)
        valor_nf = Decimal(str(round(dados.valor_total, 2)))
        diff = valor_nf - total_pagamentos
        if diff > Decimal("0.01"):
            nf.adicionar_pagamento(
                t_pag="99",
                x_pag="A Prazo",  # obrigatório para tipo 99
                v_pag=diff,
                ind_pag="1",  # 1 = A prazo
            )

        from pynfe.processamento.serializacao import SerializacaoXML, SerializacaoQrcode

        # === SERIALIZAR ===
        serializer = SerializacaoXML(fonte, homologacao=HOMOLOGACAO)
        xml_str = serializer.exportar(nf, valor_troco=float(valor_troco_total))

        # === ASSINAR ===
        assinatura = AssinaturaA1(CERT_PATH, CERT_SENHA)
        xml_assinado = assinatura.assinar(xml_str)

        # === GERAR QR CODE (obrigatório NFC-e) ===
        csc_id = os.environ.get('CSC_ID', CSC_ID)
        csc_token = os.environ.get('CSC_TOKEN', CSC_TOKEN)
        qrcode_serializer = SerializacaoQrcode()
        xml_com_qrcode = qrcode_serializer.gerar_qrcode(csc_id, csc_token, xml_assinado)

        # === TRANSMITIR ===
        con = ComunicacaoSefaz(UF, CERT_PATH, CERT_SENHA, HOMOLOGACAO)
        resposta = con.autorizacao(modelo="nfce", nota_fiscal=xml_com_qrcode, ind_sinc=1)

        # === PROCESSAR RESPOSTA (retorna tupla: 0=sucesso, 1=erro) ===
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        status_ret = resposta[0]

        if status_ret == 0:
            # Sucesso — resposta[1] é o XML nfeProc autorizado (lxml Element)
            nfe_proc = resposta[1]
            xml_final = etree.tostring(nfe_proc, encoding='unicode')

            # Extrair dados do protNFe
            inf_prot = nfe_proc.find('.//nfe:infProt', ns)
            c_stat = inf_prot.find('nfe:cStat', ns) if inf_prot is not None else None
            x_motivo = inf_prot.find('nfe:xMotivo', ns) if inf_prot is not None else None
            n_prot = inf_prot.find('nfe:nProt', ns) if inf_prot is not None else None
            dh_recbto = inf_prot.find('nfe:dhRecbto', ns) if inf_prot is not None else None
            ch_nfe = inf_prot.find('nfe:chNFe', ns) if inf_prot is not None else None

            codigo = c_stat.text if c_stat is not None else "100"
            motivo = x_motivo.text if x_motivo is not None else "Autorizada"
            chave = ch_nfe.text if ch_nfe is not None else ""
            protocolo = n_prot.text if n_prot is not None else ""
            data_aut = dh_recbto.text if dh_recbto is not None else ""

            # Gerar URL do QR Code SEFAZ-PR
            ambiente = "2" if HOMOLOGACAO else "1"
            qr_sem_hash = f"{chave}|{ambiente}|{CSC_ID}|"
            hash_csc = hashlib.sha1((qr_sem_hash + CSC_TOKEN.upper()).encode()).hexdigest().upper()
            base_qr = (
                "https://homologacao.nfce.fazenda.pr.gov.br/nfce/qrcode"
                if HOMOLOGACAO
                else "https://nfce.fazenda.pr.gov.br/nfce/qrcode"
            )
            qrcode_url = f"{base_qr}?p={chave}|{ambiente}|{CSC_ID}|{hash_csc}"

            return RespostaNFCe(
                sucesso=True,
                mensagem=f"NFC-e autorizada! ({motivo})",
                chave_acesso=chave,
                numero_nfce=nf.numero_nf,
                protocolo=protocolo,
                data_autorizacao=data_aut,
                qrcode_url=qrcode_url,
                xml_autorizado=xml_final,
            )
        else:
            # Erro — resposta[1] é o objeto requests.Response com detalhes do erro
            retorno_erro = resposta[1]
            try:
                root_err = etree.fromstring(retorno_erro.content)
                c_stat = root_err.find('.//nfe:cStat', ns)
                x_motivo = root_err.find('.//nfe:xMotivo', ns)
                codigo = c_stat.text if c_stat is not None else "????"
                motivo = x_motivo.text if x_motivo is not None else retorno_erro.text[:300]
            except Exception:
                codigo = str(retorno_erro.status_code) if hasattr(retorno_erro, 'status_code') else "????"
                motivo = str(retorno_erro)[:300]
            return RespostaNFCe(
                sucesso=False,
                mensagem=f"SEFAZ rejeitou: [{codigo}] {motivo}",
            )

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.exception(f"Erro ao emitir NFC-e: {e}")
        return RespostaNFCe(sucesso=False, mensagem=f"Erro interno: {str(e)} | {tb[-500:]}")


async def cancelar_nfce(chave_acesso: str, justificativa: str, db=None) -> dict:
    """Cancela NFC-e autorizada (até 30 min em homologação, 24h em produção)"""
    if len(justificativa.strip()) < 15:
        return {"sucesso": False, "mensagem": "Justificativa deve ter no mínimo 15 caracteres"}
    cfg = verificar_configuracao()
    if not cfg["configurado"]:
        return {"sucesso": False, "mensagem": "Configuração incompleta"}
    try:
        from pynfe.processamento.comunicacao import ComunicacaoSefaz
        from pynfe.entidades.evento import Evento
        from lxml import etree

        con = ComunicacaoSefaz(UF, CERT_PATH, CERT_SENHA, HOMOLOGACAO)
        evento = Evento()
        evento.chave = chave_acesso
        evento.cnpj = CNPJ_EMITENTE
        evento.justificativa = justificativa
        resposta = con.cancelamento(modelo="nfce", evento=evento)

        root = etree.fromstring(resposta.content)
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        c_stat = root.find('.//nfe:cStat', ns)
        x_motivo = root.find('.//nfe:xMotivo', ns)
        n_prot = root.find('.//nfe:nProt', ns)
        codigo = c_stat.text if c_stat is not None else "000"
        motivo = x_motivo.text if x_motivo is not None else ""

        if codigo in ("101", "135", "155"):
            return {
                "sucesso": True,
                "mensagem": f"NFC-e cancelada: {motivo}",
                "protocolo": n_prot.text if n_prot is not None else "",
            }
        return {"sucesso": False, "mensagem": f"[{codigo}] {motivo}"}
    except Exception as e:
        logger.exception(f"Erro ao cancelar NFC-e: {e}")
        return {"sucesso": False, "mensagem": str(e)}
