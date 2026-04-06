type RichHtmlProps = {
  className?: string;
  html: string;
};

export function RichHtml({ className, html }: RichHtmlProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
