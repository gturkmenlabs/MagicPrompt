import type { PageConfig } from '@/types/ui';

const SITE_NAME = 'NeoMagic';
const DEFAULT_DESCRIPTION =
  'NeoMagic is a professional AI workspace for prompt design, model routing, retrieval workflows, and quality review.';

export interface WorkspaceMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
}

function resolveOrigin(origin?: string): string {
  if (origin) return origin;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://neomagic.ai';
}

export function getCanonicalUrl(config: PageConfig, origin?: string): string {
  const base = resolveOrigin(origin);
  const canonicalPath = config.seo?.canonicalPath ?? (config.id === 'dashboard' ? '/' : `/${config.id}`);
  return new URL(canonicalPath, base).toString();
}

export function getWorkspaceMeta(config: PageConfig, origin?: string): WorkspaceMeta {
  const title = config.seo?.title ?? `${config.title} | ${SITE_NAME}`;
  const description = config.seo?.description ?? config.aiSummary ?? config.description ?? DEFAULT_DESCRIPTION;

  return {
    title,
    description,
    canonicalUrl: getCanonicalUrl(config, origin),
    robots: config.seo?.robots ?? 'index,follow,max-image-preview:large',
  };
}

export function buildWorkspaceStructuredData(config: PageConfig, origin?: string) {
  const meta = getWorkspaceMeta(config, origin);
  const pageUrl = meta.canonicalUrl;
  const graph: Array<Record<string, unknown>> = [
    {
      '@type': config.seo?.schemaType ?? 'WebApplication',
      '@id': `${pageUrl}#workspace`,
      name: config.title,
      description: meta.description,
      url: pageUrl,
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Web',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumbs`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: SITE_NAME,
          item: getCanonicalUrl({ ...config, id: 'dashboard', seo: { canonicalPath: '/' } }, origin),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: config.title,
          item: pageUrl,
        },
      ],
    },
  ];

  if (config.faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#faq`,
      mainEntity: config.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

export function applyWorkspaceMetadata(config: PageConfig): void {
  if (typeof document === 'undefined') return;

  const meta = getWorkspaceMeta(config);
  document.title = meta.title;
  upsertMeta('description', meta.description);
  upsertMeta('robots', meta.robots);
  upsertMeta('og:title', meta.title, 'property');
  upsertMeta('og:description', meta.description, 'property');
  upsertMeta('og:type', 'website', 'property');
  upsertMeta('og:url', meta.canonicalUrl, 'property');
  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', meta.title);
  upsertMeta('twitter:description', meta.description);
  upsertLink('canonical', meta.canonicalUrl);

  let script = document.getElementById('neomagic-page-schema') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'neomagic-page-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.text = JSON.stringify(buildWorkspaceStructuredData(config));
}
