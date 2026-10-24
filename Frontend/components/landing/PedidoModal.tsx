import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Copy, FileText, LoaderCircle, Upload, X } from 'lucide-react';
import { apiUrl, NEQUI_NUMERO, responseMessage, whatsappLink } from '../../src/api';
import '../../styles/PedidoModal.css';

type MetodoPago = 'NEQUI' | 'EFECTIVO';
type Tamano = 'CARTA' | 'OFICIO';
type TipoImpresion = 'BN' | 'COLOR';

type PedidoModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type PedidoCreado = { codigo: string; nombre: string };

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_COMPROBANTE_SIZE = 5 * 1024 * 1024;
const MAX_COPIAS = 500;

const archivoPermitido: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

const comprobantePermitido: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
};

const extension = (name: string) => `.${name.split('.').pop()?.toLowerCase() ?? ''}`;

const tipoValido = (file: File, reglas: Record<string, string[]>) => {
  const mimes = reglas[extension(file.name)];
  return Boolean(mimes) && (!file.type || mimes.includes(file.type));
};

const getFileError = (file: File | null) => {
  if (!file) return 'Selecciona un archivo para continuar.';
  if (!tipoValido(file, archivoPermitido)) {
    return 'Solo se aceptan archivos PDF, Word (.doc/.docx) o Excel (.xls/.xlsx).';
  }
  if (file.size > MAX_FILE_SIZE) return 'El archivo no puede superar los 15 MB.';
  return '';
};

const getComprobanteError = (file: File | null) => {
  if (!file) return '';
  if (!tipoValido(file, comprobantePermitido)) {
    return 'El comprobante debe ser una imagen JPG, PNG o WEBP, o un PDF.';
  }
  if (file.size > MAX_COMPROBANTE_SIZE) return 'El comprobante no puede superar los 5 MB.';
  return '';
};

/** Devuelve los 10 dígitos del celular, '' si está vacío o null si no es válido. */
const normalizarTelefono = (valor: string) => {
  const digitos = valor.replace(/\D/g, '');
  if (!digitos) return '';
  const local = digitos.length === 12 && digitos.startsWith('57') ? digitos.slice(2) : digitos;
  return /^3\d{9}$/.test(local) ? local : null;
};

const formatoMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const PedidoModal = ({ isOpen, onClose }: PedidoModalProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comprobanteInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [comprobanteError, setComprobanteError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creado, setCreado] = useState<PedidoCreado | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<MetodoPago | ''>('');
  const [copias, setCopias] = useState('1');
  const [tamano, setTamano] = useState<Tamano>('CARTA');
  const [tipoImpresion, setTipoImpresion] = useState<TipoImpresion>('BN');
  const [dobleCara, setDobleCara] = useState(false);
  const [copiado, setCopiado] = useState('');
  const [aceptaPolitica, setAceptaPolitica] = useState(false);

  const resetForm = () => {
    setFile(null);
    setComprobante(null);
    setFileError('');
    setComprobanteError('');
    setFormError('');
    setCreado(null);
    setPaymentMethod('');
    setCopias('1');
    setTamano('CARTA');
    setTipoImpresion('BN');
    setDobleCara(false);
    setCopiado('');
    setAceptaPolitica(false);
    formRef.current?.reset();
  };

  const tieneDatos = () => {
    if (creado) return false;
    if (file || comprobante || paymentMethod) return true;
    const form = formRef.current;
    return Boolean(
      form &&
        ['nombre', 'correo', 'telefono', 'notas'].some(
          (campo) => String(new FormData(form).get(campo) ?? '').trim() !== '',
        ),
    );
  };

  const handleClose = () => {
    if (isSubmitting) return;
    // Evita perder lo escrito por un toque accidental fuera del formulario
    if (tieneDatos() && !window.confirm('¿Cerrar el formulario? Se perderán los datos de tu pedido.')) {
      return;
    }
    resetForm();
    onClose();
  };

  const handleCloseRef = useRef(handleClose);
  useEffect(() => {
    handleCloseRef.current = handleClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFileError(getFileError(selected));
    setFormError('');
  };

  const handleComprobanteChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setComprobante(selected);
    setComprobanteError(getComprobanteError(selected));
  };

  const quitarComprobante = () => {
    setComprobante(null);
    setComprobanteError('');
    if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
  };

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      window.setTimeout(() => setCopiado(''), 2000);
    } catch {
      setCopiado('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const form = new FormData(event.currentTarget);
    const nombre = String(form.get('nombre') ?? '').trim();
    const correo = String(form.get('correo') ?? '').trim();
    const telefono = normalizarTelefono(String(form.get('telefono') ?? ''));
    const notas = String(form.get('notas') ?? '').trim();
    const referenciaNequi = String(form.get('referenciaNequi') ?? '').trim();
    const numeroCopias = Number(copias);
    const nextFileError = getFileError(file);
    const nextComprobanteError = paymentMethod === 'NEQUI' ? getComprobanteError(comprobante) : '';
    setFileError(nextFileError);
    setComprobanteError(nextComprobanteError);

    let error = '';
    if (nextFileError) error = nextFileError;
    else if (!nombre || !correo) error = 'Completa tu nombre y correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) error = 'Escribe un correo electrónico válido.';
    else if (telefono === null) error = 'El teléfono debe ser un celular colombiano de 10 dígitos.';
    else if (!Number.isInteger(numeroCopias) || numeroCopias < 1 || numeroCopias > MAX_COPIAS) {
      error = `El número de copias debe estar entre 1 y ${MAX_COPIAS}.`;
    } else if (!paymentMethod) error = 'Selecciona un método de pago.';
    else if (nextComprobanteError) error = nextComprobanteError;
    else if (referenciaNequi && !/^[A-Za-z0-9 -]{1,40}$/.test(referenciaNequi)) {
      error = 'La referencia de Nequi solo puede tener letras, números y guiones.';
    } else if (!aceptaPolitica) {
      error = 'Para enviar el pedido debes autorizar el tratamiento de tus datos.';
    }
    if (error || !file || telefono === null || !paymentMethod) {
      setFormError(error);
      return;
    }

    const body = new FormData();
    body.append('archivo', file);
    body.append('nombre', nombre);
    body.append('correo', correo);
    if (telefono) body.append('telefono', telefono);
    if (notas) body.append('notas', notas);
    body.append('copias', String(numeroCopias));
    body.append('tamano', tamano);
    body.append('tipoImpresion', tipoImpresion);
    body.append('dobleCara', String(dobleCara));
    body.append('metodoPago', paymentMethod);
    body.append('aceptaPolitica', 'true');
    if (paymentMethod === 'NEQUI') {
      if (referenciaNequi) body.append('referenciaNequi', referenciaNequi);
      if (comprobante) body.append('comprobante', comprobante);
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl('/pedidos'), { method: 'POST', body });
      if (response.status === 429) {
        throw new Error('Enviaste varios pedidos seguidos. Espera unos minutos o escríbenos por WhatsApp.');
      }
      if (!response.ok) {
        throw new Error(
          await responseMessage(response, 'No pudimos enviar tu pedido. Revisa los datos e inténtalo de nuevo.'),
        );
      }
      const result = (await response.json()) as { codigo: string };
      setCreado({ codigo: result.codigo, nombre });
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'No pudimos conectar con el servidor.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pedido-modal-overlay" onMouseDown={handleClose}>
      <div
        className="pedido-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pedido-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="pedido-modal-close" type="button" onClick={handleClose} aria-label="Cerrar formulario">
          <X size={21} />
        </button>

        {creado ? (
          <div className="pedido-success" role="status">
            <span className="pedido-success-icon" aria-hidden="true">
              <CheckCircle2 size={38} />
            </span>
            <p className="pedido-eyebrow">Pedido enviado</p>
            <h2 id="pedido-modal-title">¡Pedido recibido!</h2>
            <p>Guarda este código para consultar tu pedido y para recogerlo:</p>
            <div className="pedido-code">
              <strong>{creado.codigo}</strong>
              <button type="button" onClick={() => void copiar(creado.codigo, 'codigo')}>
                {copiado === 'codigo' ? <Check size={16} /> : <Copy size={16} />}
                {copiado === 'codigo' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="pedido-success-actions">
              <a
                className="pedido-submit pedido-whatsapp"
                href={whatsappLink(
                  `Hola, acabo de enviar el pedido #${creado.codigo} para imprimir a nombre de ${creado.nombre}`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Avisar por WhatsApp
              </a>
              <Link
                className="pedido-secondary"
                to={`/rastreo?codigo=${encodeURIComponent(creado.codigo)}`}
                onClick={() => {
                  resetForm();
                  onClose();
                }}
              >
                Ver estado del pedido
              </Link>
            </div>
            <button
              className="pedido-link-button"
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="pedido-modal-heading">
              <span className="pedido-modal-kicker">Imprime sin filas</span>
              <h2 id="pedido-modal-title">Sube tu archivo</h2>
              <p>Cuéntanos qué necesitas y prepararemos tu pedido.</p>
            </div>

            <form ref={formRef} className="pedido-form" onSubmit={handleSubmit} noValidate>
              <div className="pedido-file-field">
                <input
                  ref={fileInputRef}
                  className="pedido-file-input"
                  id="pedido-archivo"
                  name="archivo"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                />
                <label className="pedido-file-dropzone" htmlFor="pedido-archivo">
                  <span className="pedido-file-icon" aria-hidden="true">
                    {file ? <FileText size={24} /> : <Upload size={24} />}
                  </span>
                  <span className="pedido-file-copy">
                    <strong>{file ? file.name : 'Elige tu archivo'}</strong>
                    <small>{file ? formatoMB(file.size) : 'PDF, Word o Excel · máximo 15 MB'}</small>
                  </span>
                  <span className="pedido-file-action">Explorar</span>
                </label>
                {fileError && <span className="pedido-error">{fileError}</span>}
              </div>

              <fieldset className="pedido-specs">
                <legend>¿Cómo lo imprimimos?</legend>
                <label className="pedido-field pedido-copias">
                  <span>Copias</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_COPIAS}
                    value={copias}
                    onChange={(event) => setCopias(event.target.value)}
                  />
                </label>
                <div className="pedido-segmented" role="radiogroup" aria-label="Tamaño del papel">
                  <span className="pedido-segmented-title">Tamaño</span>
                  {(['CARTA', 'OFICIO'] as const).map((valor) => (
                    <label key={valor} className={tamano === valor ? 'is-selected' : ''}>
                      <input
                        type="radio"
                        name="tamano"
                        value={valor}
                        checked={tamano === valor}
                        onChange={() => setTamano(valor)}
                      />
                      {valor === 'CARTA' ? 'Carta' : 'Oficio'}
                    </label>
                  ))}
                </div>
                <div className="pedido-segmented" role="radiogroup" aria-label="Tipo de impresión">
                  <span className="pedido-segmented-title">Impresión</span>
                  {(['BN', 'COLOR'] as const).map((valor) => (
                    <label key={valor} className={tipoImpresion === valor ? 'is-selected' : ''}>
                      <input
                        type="radio"
                        name="tipoImpresion"
                        value={valor}
                        checked={tipoImpresion === valor}
                        onChange={() => setTipoImpresion(valor)}
                      />
                      {valor === 'BN' ? 'Blanco y negro' : 'Color'}
                    </label>
                  ))}
                </div>
                <label className="pedido-toggle">
                  <input type="checkbox" checked={dobleCara} onChange={(event) => setDobleCara(event.target.checked)} />
                  <span>Imprimir a doble cara</span>
                </label>
              </fieldset>

              <div className="pedido-fields-grid">
                <label className="pedido-field">
                  <span>Nombre <em>*</em></span>
                  <input name="nombre" type="text" placeholder="Tu nombre" autoComplete="name" maxLength={100} required />
                </label>
                <label className="pedido-field">
                  <span>Correo <em>*</em></span>
                  <input name="correo" type="email" placeholder="tu@correo.com" autoComplete="email" maxLength={160} required />
                </label>
                <label className="pedido-field">
                  <span>Celular</span>
                  <input name="telefono" type="tel" inputMode="tel" placeholder="Opcional · 3XX XXX XXXX" autoComplete="tel" />
                </label>
                <label className="pedido-field pedido-field-wide">
                  <span>Notas o instrucciones</span>
                  <textarea name="notas" rows={3} maxLength={500} placeholder="Páginas a imprimir, anillado, etc." />
                </label>
              </div>

              <fieldset className="pedido-payment-fieldset">
                <legend>Método de pago <em>*</em></legend>
                <div className="pedido-payment-options">
                  <label className={`pedido-payment-option ${paymentMethod === 'NEQUI' ? 'is-selected' : ''}`}>
                    <input type="radio" name="metodoPago" value="NEQUI" checked={paymentMethod === 'NEQUI'} onChange={() => setPaymentMethod('NEQUI')} />
                    <span><strong>Nequi</strong><small>Transfiere a {NEQUI_NUMERO}</small></span>
                  </label>
                  <label className={`pedido-payment-option ${paymentMethod === 'EFECTIVO' ? 'is-selected' : ''}`}>
                    <input type="radio" name="metodoPago" value="EFECTIVO" checked={paymentMethod === 'EFECTIVO'} onChange={() => setPaymentMethod('EFECTIVO')} />
                    <span><strong>Efectivo en el local</strong><small>Pagas al recoger</small></span>
                  </label>
                </div>

                {paymentMethod === 'NEQUI' && (
                  <div className="pedido-nequi-panel">
                    <div className="pedido-nequi-numero">
                      <span>
                        Número Nequi
                        <strong>{NEQUI_NUMERO}</strong>
                      </span>
                      <button type="button" onClick={() => void copiar(NEQUI_NUMERO.replace(/\s/g, ''), 'nequi')}>
                        {copiado === 'nequi' ? <Check size={16} /> : <Copy size={16} />}
                        {copiado === 'nequi' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p>
                      Te confirmamos el valor al revisar tu archivo. Si ya transferiste, deja la referencia o el
                      comprobante; si prefieres, pagas con Nequi al recoger.
                    </p>
                    <label className="pedido-field">
                      <span>Referencia de la transferencia</span>
                      <input name="referenciaNequi" type="text" placeholder="Opcional · ej. M1234567" maxLength={40} autoComplete="off" />
                    </label>
                    <div className="pedido-comprobante">
                      <input
                        ref={comprobanteInputRef}
                        className="pedido-file-input"
                        id="pedido-comprobante"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleComprobanteChange}
                      />
                      <label className="pedido-comprobante-button" htmlFor="pedido-comprobante">
                        <Upload size={16} aria-hidden="true" />
                        {comprobante ? comprobante.name : 'Adjuntar comprobante (opcional)'}
                      </label>
                      {comprobante && (
                        <button type="button" className="pedido-link-button" onClick={quitarComprobante}>
                          Quitar
                        </button>
                      )}
                      <small>Captura o PDF · máximo 5 MB</small>
                      {comprobanteError && <span className="pedido-error">{comprobanteError}</span>}
                    </div>
                  </div>
                )}
              </fieldset>

              <label className="pedido-consent">
                <input
                  type="checkbox"
                  checked={aceptaPolitica}
                  onChange={(event) => setAceptaPolitica(event.target.checked)}
                  required
                />
                <span>
                  Autorizo el tratamiento de mis datos para gestionar mi pedido, según la{' '}
                  <a href="/privacidad" target="_blank" rel="noopener noreferrer">
                    política de privacidad
                  </a>
                  . <em>*</em>
                </span>
              </label>

              {formError && <p className="pedido-form-error" role="alert">{formError}</p>}

              <button className="pedido-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><LoaderCircle className="pedido-spinner" size={19} /> Enviando...</> : 'Enviar pedido'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PedidoModal;
