// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FacturaRegistry {

    address public owner;

    struct FacturaData {
        string numeroFactura;
        uint256 monto;
        uint256 timestamp;
        address registradoPor;
        bool activa;
        bytes32 hashNotaCredito;
    }

    mapping(bytes32 => FacturaData) private facturas;
    mapping(bytes32 => bool) public existe;

    event FacturaRegistrada(bytes32 indexed hashSha256, string numeroFactura, uint256 timestamp);
    event FacturaAnulada(bytes32 indexed hashSha256, bytes32 hashNotaCredito, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta funcion");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registrarFactura(
        bytes32 hashSha256,
        string calldata numeroFactura,
        uint256 monto
    ) external onlyOwner {
        require(!existe[hashSha256], "El hash ya fue registrado");

        facturas[hashSha256] = FacturaData({
            numeroFactura: numeroFactura,
            monto: monto,
            timestamp: block.timestamp,
            registradoPor: msg.sender,
            activa: true,
            hashNotaCredito: bytes32(0)
        });
        existe[hashSha256] = true;

        emit FacturaRegistrada(hashSha256, numeroFactura, block.timestamp);
    }

    function verificarFactura(bytes32 hashSha256)
        external
        view
        returns (
            string memory numeroFactura,
            uint256 monto,
            uint256 timestamp,
            address registradoPor,
            bool activa,
            bytes32 hashNotaCredito
        )
    {
        require(existe[hashSha256], "Factura no encontrada");
        FacturaData storage f = facturas[hashSha256];
        return (f.numeroFactura, f.monto, f.timestamp, f.registradoPor, f.activa, f.hashNotaCredito);
    }

    function anularFactura(bytes32 hashSha256, bytes32 hashNotaCredito) external onlyOwner {
        require(existe[hashSha256], "Factura no encontrada");
        require(facturas[hashSha256].activa, "La factura ya fue anulada");

        facturas[hashSha256].activa = false;
        facturas[hashSha256].hashNotaCredito = hashNotaCredito;

        emit FacturaAnulada(hashSha256, hashNotaCredito, block.timestamp);
    }
}
