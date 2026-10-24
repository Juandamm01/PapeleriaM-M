import { useEffect } from 'react';

export function useNoIndexMeta() {
  useEffect(() => {
    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !robotsMeta;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    const previousContent = robotsMeta.content;
    robotsMeta.content = 'noindex';

    return () => {
      if (created) {
        robotsMeta?.remove();
      } else if (robotsMeta) {
        robotsMeta.content = previousContent;
      }
    };
  }, []);
}
