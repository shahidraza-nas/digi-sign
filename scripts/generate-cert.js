const forge = require("node-forge");
const fs = require("fs");
const path = require("path");

// Generate a new RSA key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a self-signed certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = "01";
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

const attrs = [
  { name: "commonName", value: "DigiSign Test" },
  { name: "organizationName", value: "DigiSign" },
  { name: "countryName", value: "US" },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);

cert.setExtensions([
  { name: "basicConstraints", cA: false },
  {
    name: "keyUsage",
    digitalSignature: true,
    nonRepudiation: true,
  },
]);

cert.sign(keys.privateKey, forge.md.sha256.create());

// Export to PKCS#12 (P12) with empty password
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "", {
  algorithm: "3des",
});
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

const certsDir = path.join(__dirname, "..", "certs");
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(certsDir, "certificate.p12"),
  Buffer.from(p12Der, "binary")
);

console.log("✓ Generated certs/certificate.p12 (self-signed, empty password)");
