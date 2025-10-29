import { getParsedDataUrlBuffer, parseDataUrl } from "@/wab/shared/data-urls";

export function pngData() {
  // 5x5 red dot
  const dataUri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
  const clipboardData = {
    "text/html":
      '<img src="https://example.com/tiny.png" alt="tiny red dot" />',
    "image/png": new File(
      [getParsedDataUrlBuffer(parseDataUrl(dataUri))],
      "tiny.png",
      { type: "image/png" }
    ),
  };
  return {
    dataUri,
    clipboardData,
    height: 5,
    width: 5,
  };
}

export function svgData() {
  const xml =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" /></svg>';
  const dataUri =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cGF0aCBkPSJNMTAgMTBoODB2ODBIMTB6Ii8+Cjwvc3ZnPgo=";
  const processedDataUri =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZpbGw6IGN1cnJlbnRDb2xvcjsiPgogIDxwYXRoIGQ9Ik0xMCAxMGg4MHY4MEgxMHoiLz4KPC9zdmc+";
  const clipboardData = {
    "text/plain": xml,
  };
  return {
    xml,
    dataUri,
    processedDataUri,
    clipboardData,
    height: 100,
    width: 100,
  };
}

export function multiColorSvgData() {
  const xml = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="200" height="200" fill="#f8f9fa"/>
  
  <!-- Home Icon -->
  <g transform="translate(100, 100)">
    <!-- Roof (Dark Blue) -->
    <path d="M-60,0 L0,-60 L60,0 Z" fill="#2c3e50"/>
    
    <!-- House Body (Light Blue) -->
    <rect x="-50" y="0" width="100" height="70" fill="#3498db"/>
    
    <!-- Door (Dark Blue) -->
    <rect x="-15" y="30" width="30" height="40" rx="2" fill="#2c3e50"/>
    
    <!-- Door Knob -->
    <circle cx="8" cy="50" r="2" fill="#3498db"/>
    
    <!-- Windows (Dark Blue) -->
    <rect x="-40" y="15" width="18" height="18" rx="1" fill="#2c3e50"/>
    <rect x="22" y="15" width="18" height="18" rx="1" fill="#2c3e50"/>
    
    <!-- Window Dividers (Light Blue) -->
    <line x1="-31" y1="15" x2="-31" y2="33" stroke="#3498db" stroke-width="1.5"/>
    <line x1="-40" y1="24" x2="-22" y2="24" stroke="#3498db" stroke-width="1.5"/>
    <line x1="31" y1="15" x2="31" y2="33" stroke="#3498db" stroke-width="1.5"/>
    <line x1="22" y1="24" x2="40" y2="24" stroke="#3498db" stroke-width="1.5"/>
  </g>
</svg>`;

  const dataUri =
    "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIEJhY2tncm91bmQgLS0+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmOGY5ZmEiLz4KICAKICA8IS0tIEhvbWUgSWNvbiAtLT4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAsIDEwMCkiPgogICAgPCEtLSBSb29mIChEYXJrIEJsdWUpIC0tPgogICAgPHBhdGggZD0iTS02MCwwIEwwLC02MCBMNjAsMCBaIiBmaWxsPSIjMmMzZTUwIi8+CiAgICAKICAgIDwhLS0gSG91c2UgQm9keSAoTGlnaHQgQmx1ZSkgLS0+CiAgICA8cmVjdCB4PSItNTAiIHk9IjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNzAiIGZpbGw9IiMzNDk4ZGIiLz4KICAgIAogICAgPCEtLSBEb29yIChEYXJrIEJsdWUpIC0tPgogICAgPHJlY3QgeD0iLTE1IiB5PSIzMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjQwIiByeD0iMiIgZmlsbD0iIzJjM2U1MCIvPgogICAgCiAgICA8IS0tIERvb3IgS25vYiAtLT4KICAgIDxjaXJjbGUgY3g9IjgiIGN5PSI1MCIgcj0iMiIgZmlsbD0iIzM0OThkYiIvPgogICAgCiAgICA8IS0tIFdpbmRvd3MgKERhcmsgQmx1ZSkgLS0+CiAgICA8cmVjdCB4PSItNDAiIHk9IjE1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIxIiBmaWxsPSIjMmMzZTUwIi8+CiAgICA8cmVjdCB4PSIyMiIgeT0iMTUiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjEiIGZpbGw9IiMyYzNlNTAiLz4KICAgIAogICAgPCEtLSBXaW5kb3cgRGl2aWRlcnMgKExpZ2h0IEJsdWUpIC0tPgogICAgPGxpbmUgeDE9Ii0zMSIgeTE9IjE1IiB4Mj0iLTMxIiB5Mj0iMzMiIHN0cm9rZT0iIzM0OThkYiIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KICAgIDxsaW5lIHgxPSItNDAiIHkxPSIyNCIgeDI9Ii0yMiIgeTI9IjI0IiBzdHJva2U9IiMzNDk4ZGIiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgICA8bGluZSB4MT0iMzEiIHkxPSIxNSIgeDI9IjMxIiB5Mj0iMzMiIHN0cm9rZT0iIzM0OThkYiIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KICAgIDxsaW5lIHgxPSIyMiIgeTE9IjI0IiB4Mj0iNDAiIHkyPSIyNCIgc3Ryb2tlPSIjMzQ5OGRiIiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDwvZz4KPC9zdmc+";
  const clipboardData = {
    "text/plain": xml,
  };
  return {
    xml,
    dataUri,
    clipboardData,
    height: 100,
    width: 100,
  };
}
