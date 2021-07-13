import {
  parseDmnContent,
  parseEmptyDmnContent,
  buildXlsx,
  buildEmptyXlsx
} from './excelHandler';

import {
  buildXmlFromDmnContent
} from './dmnXmlGenerator';

import {
  buildJsonFromXML
} from './dmnJsonGenerator';

import {
  buildJsonFromEmptyXML
} from './dmnJsonGenerator';

export const convertXlsxToDmn = (options) => {
  const dmnContent = parseDmnContent(options);
  return buildXmlFromDmnContent(dmnContent);
};

export const convertDmnToXlsx = async (options) => {
  const dmnContent = await buildJsonFromXML(options);
  const xlsx = buildXlsx(dmnContent);

  return {
    contents: xlsx,
    exportedDecisionTables: dmnContent
  };
};

export const convertEmptyDmnToXlsx = async (options) => {
  const emptyContent = await buildJsonFromEmptyXML(options);
  const xlsx = buildEmptyXlsx(emptyContent);

  return {
    contents: xlsx,
    exportedDecisionTables: emptyContent
  };
};