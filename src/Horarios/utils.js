const excelGenerator = (products, name, res) => {
    const xl = require('excel4node');

    // Transformamos los productos: _id → id
    products = products.map((product) => {
        const id = product._id.toString();
        delete product._id;
        return {
            id,
            ...product
        };
    });

    const wb = new xl.Workbook();
    const ws = wb.addWorksheet('inventario');

    // Obtenemos las columnas desde el primer producto
    const columns = Object.values(products[0]);

    // Recorremos filas
    for (let i = 1; i <= products.length; i++) {
        const rowValues = Object.values(products[i - 1]);

        // Recorremos columnas
        for (let j = 1; j <= columns.length; j++) {
            const data = rowValues[j - 1];

            if (typeof data === 'string') {
                ws.cell(i, j).string(data); 
            } else {
                ws.cell(i, j).number(data);
            }
        }
    }

    wb.write(`${name}.xlsx`, res);
};

module.exports.ProductsUtils = {
    excelGenerator
};
