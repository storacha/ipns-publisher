# IPNS Publisher

Script that watches all IPNS updates from Web3.Storage and publishes them to the IPFS DHT.

## Usage

Start an IPFS daemon _and_ the publisher script:

```sh
npm start
```

For development, use `npm run start:publisher` to start only the publisher script (you'll need to start your IPFS node manually or use `npm run start:ipfs`).
