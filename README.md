## After Fresh checkout

1. Run the following to install dependencies
```
npm install
```

2. Go to config/private_config.ts and add your private key and rpc url

```
export const PRIVATE_KEY = '<ADD PRIVATE KEY HERE>'
export const RPC_URL = "<ADD RPC URL HERE>"

```

3. Compile and run


## Compile and run

```
npx tsc
node index.js
```

## Run tests

```
npm test
```

or 

```
npx jest
```

## Basic Project Setup From Scratch

```
Note: This is what I did to setup the project from scratch and this does not need to be done again. This is for personal reference.
```


```
npm init -y
npm install typescript --save-dev
npx tsc --init
touch index.ts
npx tsc
node index.js
mkdir tests
touch tests/__tests__
npx ts-jest config:init
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev @types/node
npm install ethers@^5.0.0
npm install bignumber.js
```

Added the following to package.json:

```
"scripts": {
    "test": "jest"
  }
```


## Refernce of what was manually installed

```
npm install typescript --save-dev
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev @types/node
npm install ethers@^5.0.0
npm install bignumber.js
```

