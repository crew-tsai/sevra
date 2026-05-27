import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  noindex?: boolean;
}

const SITE = "https://demo.safesevra.com";

export function PageMeta({ title, description, path = "/", type = "website", noindex }: PageMetaProps) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
}
