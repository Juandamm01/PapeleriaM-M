import React, { useEffect, useRef, useState } from 'react';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumnProps {
  title: string;
  links: FooterLink[];
}

const FooterColumn: React.FC<FooterColumnProps> = ({ title, links }) => (
  <div>
    <h3 className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-clinical-white/70">
      {title}
    </h3>
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.label}>
          <a className="hover-lift inline-block text-sm font-semibold text-clinical-white" href={link.href}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`snap-section dot-pattern relative mb-0 flex min-h-screen w-full items-center overflow-hidden rounded-none bg-vibrant-cyan px-6 py-20 text-clinical-white shadow-[0_24px_60px_rgba(27,197,255,0.22)] transition-opacity duration-700 ease-out sm:px-10 sm:py-20 md:px-16 md:py-28 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="relative z-10 w-full max-w-none">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <div className="relative mb-7 flex h-24 w-24 items-center justify-center rounded-full border-2 border-clinical-white/80 bg-clinical-white text-vibrant-cyan shadow-lg">
              <span className="material-symbols-outlined relative text-[2.25rem]" aria-hidden="true">
                print
              </span>
            </div>
            <span className="mb-7 block text-xs font-bold uppercase tracking-widest text-clinical-white/80">
              Internet Impre-Copias M&amp;M
            </span>
            <h2 className="max-w-md text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-5xl">
              Todo listo para
              <br />
              tus ideas.
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterColumn
              title="Navegación"
              links={[
                { label: 'Inicio', href: '#inicio' },
                { label: 'Nosotros', href: '#nosotros' },
                { label: 'Servicios', href: '#servicios' },
                { label: 'Contacto', href: '#contacto' },
                { label: 'Rastrear pedido', href: '/rastreo' },
              ]}
            />
            <FooterColumn
              title="Servicios"
              links={[
                { label: 'Fotocopias', href: '#servicios' },
                { label: 'Impresiones', href: '#servicios' },
                { label: 'Escaneo y Digital', href: '#servicios' },
                { label: 'Certificados', href: '#servicios' },
              ]}
            />
            <FooterColumn
              title="Síguenos"
              links={[
                { label: 'WhatsApp', href: 'https://wa.me/573138395365' },
                { label: 'Instagram', href: '#' },
              ]}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-clinical-white/25 pt-5 text-xs font-semibold text-clinical-white/80 sm:flex-row sm:items-center sm:justify-between">
          <span>© {currentYear} Internet Impre-Copias M&amp;M. Todos los derechos reservados.</span>
          <span className="flex items-center gap-1.5 text-clinical-white">
            Hecho con <span className="text-xl leading-none text-fuchsia-pop" aria-label="amor">❤</span>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
