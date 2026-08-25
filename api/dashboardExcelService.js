import XLSX from "xlsx";

const SUPPORTED_EXTENSIONS = ['.xlsx', '.xls'];
const DEFAULT_METRICS = [
  'Nilai_Utama',
  'NOA',
  'Persentase',
  'Target',
  'Target_NOA',
  'Pencapaian_Target',
  'Pertumbuhan_Nominal',
  'Pertumbuhan_Persen',
  'Pertumbuhan_NOA',
];
const MAX_CHARTS_PER_SLIDE = 8;
const TECHNICAL_SHEET_NAMES = ['data_dashboard'];

function buildDashboardFromWorkbook(buffer, options = {}) {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: false,
  });

  if (!workbook.SheetNames.length) {
    throw new Error('Workbook tidak memiliki sheet.');
  }

  const sheetName = resolveDashboardSheetName(workbook, options.preferredSheet);
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: true,
  });

  const rows = rawRows
    .map(normalizeRow)
    .filter((row) => Object.values(row).some((value) => value !== null && value !== ''));

  if (!rows.length) {
    throw new Error(`Sheet "${sheetName}" tidak memiliki data tabel.`);
  }

  const metricKeys = DEFAULT_METRICS.filter((key) =>
    rows.some((row) => typeof row[key] === 'number')
  );

  return {
    fileName: options.originalName || null,
    sheetName,
    availableSheets: workbook.SheetNames,
    columns: Object.keys(rows[0]),
    periods: getUniqueSortedPeriods(rows),
    categories: getUniqueValues(rows, 'Kategori'),
    indicators: getIndicators(rows),
    rows,
    charts: buildCharts(rows, metricKeys),
    summary: buildSummary(rows, metricKeys),
  };
}

function buildSlideDashboardFromWorkbook(buffer, options = {}) {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: false,
  });

  if (!workbook.SheetNames.length) {
    throw new Error('Workbook tidak memiliki sheet.');
  }

  const candidateSheets = workbook.SheetNames.filter(
    (sheetName) => !TECHNICAL_SHEET_NAMES.includes(sheetName.trim().toLowerCase())
  );

  const slides = candidateSheets
    .map((sheetName) => buildSlideFromSheet(workbook.Sheets[sheetName], sheetName))
    .filter((slide) => slide.tableRows.length || slide.charts.length);

  if (!slides.length) {
    throw new Error('Workbook tidak memiliki sheet dashboard yang bisa diproses.');
  }

  return {
    fileName: options.originalName || null,
    availableSheets: workbook.SheetNames,
    slides,
    summary: {
      totalSlides: slides.length,
      totalCharts: slides.reduce((total, slide) => total + slide.charts.length, 0),
      slideNames: slides.map((slide) => slide.name),
    },
  };
}

function buildSlideFromSheet(worksheet, sheetName) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });
  const normalizedSheetName = sheetName.trim();
  const title = getSlideTitle(normalizedSheetName, matrix);
  const config = detectSlideConfig(matrix);
  const tableRows = config ? extractSlideRows(matrix, config) : [];
  const chartRows = pickChartRows(tableRows, normalizedSheetName);

  return {
    id: slugify(normalizedSheetName),
    name: toTitle(normalizedSheetName),
    sheetName,
    title,
    tableRows,
    charts: chartRows.map((row) => buildSlideChart(row, normalizedSheetName)),
  };
}

function detectSlideConfig(matrix) {
  const headerLimit = Math.min(matrix.length, 12);
  const labelColumn = detectLabelColumn(matrix, headerLimit);
  const periodCells = findPeriodCells(matrix, headerLimit, labelColumn);

  if (!periodCells.length) {
    return null;
  }

  const metricHeaderRow = detectMetricHeaderRow(matrix, headerLimit);
  const dataStartRow = detectDataStartRow(matrix, labelColumn, metricHeaderRow + 1);
  const periods = buildDynamicPeriodConfig(matrix, periodCells, metricHeaderRow);
  const target = detectNamedMetricColumns(matrix, headerLimit, metricHeaderRow, /target/i, {
    excludePattern: /pencapaian|achievement/i,
    stopPattern: /pencapaian|achievement|pertumbuhan|growth/i,
  });
  const growth = detectNamedMetricColumns(matrix, headerLimit, metricHeaderRow, /pertumbuhan|growth/i);
  const achievement = detectNamedColumn(matrix, headerLimit, /pencapaian|achievement/i);

  if (!periods.length || dataStartRow === -1) {
    return null;
  }

  return {
    labelColumn,
    dataStartRow,
    periods,
    target,
    achievement,
    growth,
  };
}

function detectLabelColumn(matrix, headerLimit) {
  for (let rowIndex = 0; rowIndex < headerLimit; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    const foundIndex = row.findIndex((value) =>
      /indikator|perincian|uraian|keterangan/i.test(cleanText(value) || '')
    );

    if (foundIndex !== -1) {
      return foundIndex;
    }
  }

  const columnScores = new Map();
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const text = cleanText(row[colIndex]);
      if (text && parseDashboardNumber(text) === null && !isHeaderNoise(text)) {
        columnScores.set(colIndex, (columnScores.get(colIndex) || 0) + 1);
      }
    }
  }

  return [...columnScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
}

function findPeriodCells(matrix, headerLimit, labelColumn) {
  const cells = [];

  for (let rowIndex = 0; rowIndex < headerLimit; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    for (let colIndex = labelColumn + 1; colIndex < row.length; colIndex += 1) {
      const text = cleanText(row[colIndex]);
      if (text && isPeriodLabel(text)) {
        cells.push({ rowIndex, colIndex, label: text });
      }
    }
  }

  return cells.sort((a, b) => a.colIndex - b.colIndex);
}

function detectMetricHeaderRow(matrix, headerLimit) {
  let best = { rowIndex: 0, score: 0 };

  for (let rowIndex = 0; rowIndex < headerLimit; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    const score = row.filter((value) => classifyMetric(cleanText(value))).length;

    if (score >= best.score) {
      best = { rowIndex, score };
    }
  }

  return best.rowIndex;
}

function detectDataStartRow(matrix, labelColumn, startRow) {
  for (let rowIndex = Math.max(startRow, 0); rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    const label = cleanText(row[labelColumn]);

    if (!label || isSectionLabel(label) || isHeaderNoise(label)) {
      continue;
    }

    const numericCount = row.filter((value, colIndex) => {
      if (colIndex === labelColumn) {
        return false;
      }

      return parseDashboardNumber(value) !== null;
    }).length;

    if (numericCount > 0) {
      return rowIndex;
    }
  }

  return -1;
}

function buildDynamicPeriodConfig(matrix, periodCells, metricHeaderRow) {
  return periodCells.map((periodCell, index) => {
    const nextPeriodCol = periodCells[index + 1]?.colIndex;
    const endCol = nextPeriodCol || detectPeriodEndColumn(matrix, metricHeaderRow, periodCell.colIndex);
    const columns = detectMetricColumns(matrix, metricHeaderRow, periodCell.colIndex, endCol);

    return {
      label: periodCell.label,
      nominal: columns.nominal ?? periodCell.colIndex,
      percentage: columns.percentage,
      noa: columns.noa,
    };
  });
}

function detectPeriodEndColumn(matrix, metricHeaderRow, startCol) {
  const row = matrix[metricHeaderRow] || [];
  let endCol = row.length || startCol + 1;

  for (let colIndex = startCol + 1; colIndex < row.length; colIndex += 1) {
    const header = getColumnHeaderText(matrix, colIndex, metricHeaderRow);
    if (/target|pencapaian|pertumbuhan|growth/i.test(header)) {
      endCol = colIndex;
      break;
    }
  }

  return endCol;
}

function detectMetricColumns(matrix, metricHeaderRow, startCol, endCol) {
  const columns = {};

  for (let colIndex = startCol; colIndex < endCol; colIndex += 1) {
    const metric = classifyColumnMetric(matrix, metricHeaderRow, colIndex);

    if (metric && columns[metric] === undefined) {
      columns[metric] = colIndex;
    }
  }

  if (columns.nominal === undefined) {
    columns.nominal = startCol;
  }

  return columns;
}

function detectNamedMetricColumns(matrix, headerLimit, metricHeaderRow, pattern, options = {}) {
  const matchingColumns = [];
  const maxColumns = Math.max(...matrix.slice(0, headerLimit).map((row) => row.length), 0);

  for (let colIndex = 0; colIndex < maxColumns; colIndex += 1) {
    const header = getColumnHeaderText(matrix, colIndex, headerLimit - 1);
    if (pattern.test(header) && !options.excludePattern?.test(header)) {
      matchingColumns.push(colIndex);
    }
  }

  if (!matchingColumns.length) {
    return {};
  }

  const startCol = matchingColumns[0];
  const endCol = findNamedMetricEndColumn(matrix, headerLimit, startCol, maxColumns, options);
  return detectMetricColumns(matrix, metricHeaderRow, startCol, endCol);
}

function findNamedMetricEndColumn(matrix, headerLimit, startCol, maxColumns, options) {
  if (!options.stopPattern) {
    return Math.min(maxColumns, startCol + 5);
  }

  for (let colIndex = startCol + 1; colIndex < maxColumns; colIndex += 1) {
    const header = getColumnHeaderText(matrix, colIndex, headerLimit - 1);
    if (options.stopPattern.test(header)) {
      return colIndex;
    }
  }

  return Math.min(maxColumns, startCol + 5);
}

function detectNamedColumn(matrix, headerLimit, pattern) {
  const maxColumns = Math.max(...matrix.slice(0, headerLimit).map((row) => row.length), 0);

  for (let colIndex = 0; colIndex < maxColumns; colIndex += 1) {
    const header = getColumnHeaderText(matrix, colIndex, headerLimit - 1);
    if (pattern.test(header)) {
      return colIndex;
    }
  }

  return undefined;
}

function getColumnHeaderText(matrix, colIndex, maxRowIndex) {
  const parts = [];

  for (let rowIndex = 0; rowIndex <= maxRowIndex; rowIndex += 1) {
    const text = cleanText(matrix[rowIndex]?.[colIndex]);
    if (text) {
      parts.push(text);
    }
  }

  return parts.join(' ');
}

function classifyMetric(value) {
  if (!value) {
    return null;
  }

  if (/^%$|persen|persentase/i.test(value)) {
    return 'percentage';
  }

  if (/noa|rekening|nasabah/i.test(value)) {
    return 'noa';
  }

  if (/nominal|amount|nilai|rp/i.test(value)) {
    return 'nominal';
  }

  return null;
}

function classifyColumnMetric(matrix, metricHeaderRow, colIndex) {
  const nearbyRows = [
    metricHeaderRow,
    metricHeaderRow - 1,
    metricHeaderRow - 2,
    metricHeaderRow + 1,
  ];

  for (const rowIndex of nearbyRows) {
    if (rowIndex < 0 || rowIndex >= matrix.length) {
      continue;
    }

    const metric = classifyMetric(cleanText(matrix[rowIndex]?.[colIndex]));
    if (metric) {
      return metric;
    }
  }

  return null;
}

function isPeriodLabel(value) {
  return (
    /^(jan|feb|mar|apr|mei|may|jun|jul|aug|agu|sep|oct|okt|nov|dec|des)[a-z]*[-\s']?\d{2,4}$/i.test(value) ||
    /^(q[1-4]|tw\s*[1-4]|triwulan\s*[ivx1-4])[-\s]?\d{2,4}$/i.test(value) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(value)
  );
}

function isHeaderNoise(value) {
  return /^(actual|target|nominal|noa|%|indikator|perincian|pertumbuhan|pencapaian)$/i.test(
    value
  );
}

function extractSlideRows(matrix, config) {
  return matrix.slice(config.dataStartRow).reduce((rows, row, index) => {
    const label = cleanText(row[config.labelColumn]);

    if (!label || isSectionLabel(label)) {
      return rows;
    }

    const periods = config.periods.map((period) => ({
      period: period.label,
      nominal: parseDashboardNumber(row[period.nominal]),
      percentage: parseDashboardNumber(row[period.percentage]),
      noa: parseDashboardNumber(row[period.noa]),
    }));

    const hasData = periods.some(
      (period) =>
        period.nominal !== null || period.percentage !== null || period.noa !== null
    );

    if (!hasData) {
      return rows;
    }

    rows.push({
      id: slugify(`${label}-${index}`),
      label,
      periods,
      target: {
        nominal: parseDashboardNumber(row[config.target?.nominal]),
        noa: parseDashboardNumber(row[config.target?.noa]),
      },
      achievement: parseDashboardNumber(row[config.achievement]),
      growth: {
        nominal: parseDashboardNumber(row[config.growth?.nominal]),
        percentage: parseDashboardNumber(row[config.growth?.percentage]),
        noa: parseDashboardNumber(row[config.growth?.noa]),
      },
    });

    return rows;
  }, []);
}

function pickChartRows(tableRows, sheetName) {
  const priority = getSlidePriority(sheetName);
  const picked = [];
  const usedIds = new Set();

  for (const keyword of priority) {
    const row = tableRows.find((item) =>
      normalizeComparableText(item.label).includes(normalizeComparableText(keyword))
    );

    if (row && !usedIds.has(row.id)) {
      picked.push(row);
      usedIds.add(row.id);
    }
  }

  for (const row of tableRows) {
    if (picked.length >= MAX_CHARTS_PER_SLIDE) {
      break;
    }

    if (!usedIds.has(row.id)) {
      picked.push(row);
      usedIds.add(row.id);
    }
  }

  return picked;
}

function getSlidePriority(sheetName) {
  const priorities = {
    'Inputan Data Tabel': [
      'Total Aset',
      'Kredit Yang Diberikan',
      'Dana Pihak Ketiga',
      'Jumlah Modal',
      'Laba/Rugi Tahun Berjalan',
      'NPL Netto',
      'NPL Gross',
      'BOPO',
    ],
    Slide_Highlight: [
      'Total Aset',
      'Kredit Yang Diberikan',
      'Dana Pihak Ketiga',
      'Jumlah Modal',
      'Laba/Rugi Tahun Berjalan',
      'NPL Netto',
      'NPL Gross',
      'BOPO',
    ],
    'Slide_Penjelasan Kredit': [
      'Kredit Yang Diberikan',
      'Run Off',
      'Pencairan Kredit',
      'Produk Angsuran',
      'Produk PRK',
      'Produk Ballon Payment',
      'Penyelesaian Kredit Bermasalah',
    ],
    Slide_NPL: [
      'Kredit Yang Diberikan',
      'Kol 1 - Lancar',
      'Kol 2 - Dalam Perhatian Khusus',
      'Kol 3 - Kurang Lancar',
      'Kol 4 - Diragukan',
      'Kol 5 - Macet',
      'Jumlah Nominal NPL',
      'PPKA/CKPN',
    ],
    'Slide_Dana Dan Modal': [
      'Dana Pihak Ketiga',
      'Tabungan',
      'Deposito',
      'Penempatan Dana Di Bank Lain',
      'Dana Pihak Kedua',
      'Jumlah Modal',
      'Modal Setor',
    ],
    'Slide_Laba Rugi': [
      'Pendapatan Operasional',
      'Pendapatan Bunga Kontraktual',
      'Beban Operasional',
      'Beban Bunga Kontraktual',
      'Laba/Rugi Operasional',
      'Laba/Rugi Non Operasional',
      'Laba/Rugi Tahun Berjalan Sebelum Pajak',
      'Jumlah Akumulasi Laba',
    ],
  };

  return priorities[sheetName] || [];
}

function buildSlideChart(row, sheetName) {
  const series = [
    {
      metric: 'Nominal',
      data: row.periods.map((period) => period.nominal),
    },
  ];

  if (row.periods.some((period) => period.noa !== null)) {
    series.push({
      metric: 'NOA',
      data: row.periods.map((period) => period.noa),
    });
  }

  if (row.periods.some((period) => period.percentage !== null)) {
    series.push({
      metric: 'Persentase',
      data: row.periods.map((period) => period.percentage),
    });
  }

  return {
    id: row.id,
    title: row.label,
    labels: row.periods.map((period) => period.period),
    series,
    target: row.target,
    achievement: row.achievement,
    growth: row.growth,
    recommendedType: pickSlideChartType(row, sheetName),
  };
}

function pickSlideChartType(row, sheetName) {
  if (sheetName === 'Slide_Laba Rugi' || /rasio|npl|par|roa|roe|bopo|nim|ldr/i.test(row.label)) {
    return 'line';
  }

  return 'bar-line';
}

function findSlideTitle(matrix) {
  const firstText = matrix
    .flat()
    .map(cleanText)
    .find((value) => value && !['Indikator', 'Perincian'].includes(value));

  return firstText || null;
}

function getSlideTitle(sheetName, matrix) {
  const knownTitles = {
    'Inputan Data Tabel': 'Inputan Data Tabel',
    Slide_Highlight: 'Highlight Kinerja',
    'Slide_Penjelasan Kredit': 'Penjelasan Kredit',
    Slide_NPL: 'Perhitungan NPL',
    'Slide_Dana Dan Modal': 'Dana dan Modal',
    'Slide_Laba Rugi': 'Laba Rugi',
  };
  const detectedTitle = findSlideTitle(matrix);

  if (!detectedTitle || ['Actual', 'Target Triwulan II Juni 2026'].includes(detectedTitle)) {
    return knownTitles[sheetName] || toTitle(sheetName);
  }

  return detectedTitle;
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).replace(/\s+/g, ' ').trim();
  return text || null;
}

function isSectionLabel(label) {
  return /^[IVX]+\./i.test(label) || /^Perincian$/i.test(label);
}

function parseDashboardNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const trimmed = String(value).trim();
  if (!trimmed || /^[-–—]\s*$/.test(trimmed)) {
    return null;
  }

  const isNegative = /^\(.+\)$/.test(trimmed);
  const normalized = trimmed
    .replace(/[()%\s]/g, '')
    .replace(/,/g, '');
  const numeric = Number(normalized);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return isNegative ? -numeric : numeric;
}

function toTitle(value) {
  return value.replace(/_/g, ' ').trim();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeComparableText(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDashboardSheetName(workbook, preferredSheet) {
  if (preferredSheet && workbook.Sheets[preferredSheet]) {
    return preferredSheet;
  }

  const dashboardSheet = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === 'data_dashboard'
  );

  return dashboardSheet || workbook.SheetNames[0];
}

function normalizeRow(row) {
  return Object.entries(row).reduce((normalized, [key, value]) => {
    const cleanKey = String(key).trim();
    normalized[cleanKey] = normalizeValue(cleanKey, value);
    return normalized;
  }, {});
}

function normalizeValue(key, value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (key.toLowerCase() === 'periode') {
    return normalizePeriod(value);
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numeric = Number(trimmed.replace(',', '.'));

    if (trimmed !== '' && Number.isFinite(numeric) && !looksLikeCode(trimmed)) {
      return numeric;
    }

    return trimmed;
  }

  return value;
}

function normalizePeriod(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 25000) {
    const parsedDate = XLSX.SSF.parse_date_code(numeric);
    if (parsedDate) {
      return `${parsedDate.y}-${pad(parsedDate.m)}-${pad(parsedDate.d)}`;
    }
  }

  return String(value).trim();
}

function looksLikeCode(value) {
  return /[a-zA-Z]/.test(value) && /[-_]/.test(value);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getUniqueSortedPeriods(rows) {
  return getUniqueValues(rows, 'Periode').sort((a, b) => {
    const left = Date.parse(a);
    const right = Date.parse(b);

    if (Number.isFinite(left) && Number.isFinite(right)) {
      return left - right;
    }

    return String(a).localeCompare(String(b));
  });
}

function getUniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))];
}

function getIndicators(rows) {
  const byCode = new Map();

  for (const row of rows) {
    const code = row.Kode_Indikator || row.Indikator;
    if (!code || byCode.has(code)) {
      continue;
    }

    byCode.set(code, {
      code,
      name: row.Indikator || code,
      category: row.Kategori || null,
      subcategory: row.Subkategori || null,
      unit: row.Satuan || null,
    });
  }

  return [...byCode.values()];
}

function buildCharts(rows, metricKeys) {
  const groups = new Map();

  for (const row of rows) {
    const indicatorCode = row.Kode_Indikator || row.Indikator || 'UNKNOWN';
    const key = `${indicatorCode}::${row.Indikator || indicatorCode}`;

    if (!groups.has(key)) {
      groups.set(key, {
        indicatorCode,
        title: row.Indikator || indicatorCode,
        category: row.Kategori || null,
        subcategory: row.Subkategori || null,
        unit: row.Satuan || null,
        labels: [],
        series: metricKeys.map((metric) => ({
          metric,
          data: [],
        })),
      });
    }

    const chart = groups.get(key);
    chart.labels.push(row.Periode);

    for (const series of chart.series) {
      series.data.push(row[series.metric] ?? null);
    }
  }

  return [...groups.values()].map((chart) => ({
    ...chart,
    recommendedType: pickChartType(chart),
  }));
}

function pickChartType(chart) {
  if (chart.series.some((series) => /persen|persentase|pencapaian/i.test(series.metric))) {
    return 'line';
  }

  return chart.labels.length > 1 ? 'line' : 'bar';
}

function buildSummary(rows, metricKeys) {
  const latestPeriod = getUniqueSortedPeriods(rows).at(-1) || null;
  const latestRows = latestPeriod ? rows.filter((row) => row.Periode === latestPeriod) : rows;

  return {
    latestPeriod,
    totalRows: rows.length,
    totalIndicators: getIndicators(rows).length,
    metricKeys,
    byCategory: getUniqueValues(rows, 'Kategori').map((category) => ({
      category,
      totalIndicators: latestRows.filter((row) => row.Kategori === category).length,
    })),
  };
}

export {
  buildDashboardFromWorkbook,
  buildSlideDashboardFromWorkbook,
  SUPPORTED_EXTENSIONS,
};
