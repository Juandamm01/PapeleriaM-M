import { memo } from 'react';
import type { PaginaPdf } from '../compartido/pdf-analisis';

type Props = {
  paginas: PaginaPdf[];
  seleccion: Set<number>;
  color: Set<number>;
  modo: 'seleccion' | 'color';
  onAlternar: (numero: number) => void;
};

/** Cuadrícula de páginas: cada miniatura es un botón accesible. */
function SelectorPaginasBase({ paginas, seleccion, color, modo, onAlternar }: Props) {
  return (
    <ul className="imp-paginas" aria-label="Páginas del documento">
      {paginas.map((pagina) => {
        const elegida = seleccion.has(pagina.numero);
        const enColor = color.has(pagina.numero);
        const horizontal = pagina.ancho > pagina.alto;
        const deshabilitada = modo === 'color' && !elegida;
        const estado = elegida ? (enColor ? 'a color' : 'incluida') : 'no se imprime';
        return (
          <li key={pagina.numero}>
            <button
              type="button"
              className={[
                'imp-pagina',
                elegida ? 'is-elegida' : '',
                enColor ? 'is-color' : '',
                horizontal ? 'is-horizontal' : '',
                pagina.posiblementeEnBlanco ? 'is-blanca' : '',
              ].join(' ')}
              aria-pressed={modo === 'color' ? enColor : elegida}
              aria-label={`Página ${pagina.numero}, ${estado}${pagina.posiblementeEnBlanco ? ', posiblemente en blanco' : ''}`}
              disabled={deshabilitada}
              onClick={() => onAlternar(pagina.numero)}
            >
              <span className="imp-pagina__hoja" aria-hidden="true">
                {pagina.posiblementeEnBlanco ? <span className="imp-pagina__aviso">?</span> : null}
              </span>
              <span className="imp-pagina__num">{pagina.numero}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export const SelectorPaginas = memo(SelectorPaginasBase);
