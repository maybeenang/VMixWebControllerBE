// make xml parser with fast-xml-parser

import { ValidationError, XMLParser, XMLValidator } from "fast-xml-parser";

export const parseXML = (xml: string) => {
  const validXML: true | ValidationError = XMLValidator.validate(xml);

  if (!validXML) {
    return xml;
  }
  const parser = new XMLParser();
  return parser.parse(xml);
};
