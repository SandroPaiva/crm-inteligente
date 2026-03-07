export const generateCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("Nenhum dado para exportar");
        return;
    }

    // Pega todas as chaves possiveis de todos os objetos (caso algum tenha e outro nao)
    const headers = Array.from(new Set(data.flatMap(Object.keys)));

    const csvContent = [
        headers.join(","), // cabeçalho
        ...data.map(row => 
            headers.map(fieldName => {
                let cellData = row[fieldName] === null || row[fieldName] === undefined 
                    ? "" 
                    : String(row[fieldName]);
                // Trata virgulas e aspas duplas no valor
                cellData = cellData.replace(/"/g, '""');
                if (cellData.search(/("|,|\n)/g) >= 0) {
                    cellData = `"${cellData}"`;
                }
                return cellData;
            }).join(",")
        )
    ].join("\\n");

    const blob = new Blob(["\\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
