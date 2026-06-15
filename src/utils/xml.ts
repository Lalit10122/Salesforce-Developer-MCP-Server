import { create } from 'xmlbuilder2';

export function buildMetadataXml(rootElementName: string, content: Record<string, any>): string {
  const obj = {
    [rootElementName]: {
      '@xmlns': 'http://soap.sforce.com/2006/04/metadata',
      ...content,
    },
  };
  return create({ version: '1.0', encoding: 'UTF-8' }, obj).end({ prettyPrint: true, indent: '    ' });
}
