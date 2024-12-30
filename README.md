<div align="center">
<img width="128" src="/src/assets/img/logo.svg" alt="logo"/>
<h1> Chrome Extension Boilerplate with<br/>SolidJS + Vite + TypeScript + Manifest V3 + Hot Relaod</h1>

![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)

<!-- ![GitHub action badge](https://github.com/thearturca/solid-chrome-extension-template/actions/workflows/build.yml/badge.svg) -->

</div>

## Intro <a name="intro"></a>

> [!IMPORTANT]
> This is updated version of [solid-chrome-extension-template](https://github.com/fuyutarow/solid-chrome-extension-template). 
> All dependencies are updated. Jest replaced with Vitest.

This boilerplate is made for creating chrome extensions using SolidJS and Typescript.

> The focus was on improving the build speed and development experience with Vite.

## Features <a name="features"></a>

- [SolidJS](https://www.solidjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Vitest](https://vitest.dev/)
- [SASS](https://sass-lang.com/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Chrome Extension Manifest Version 3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- Hot Reload (Live reload)

## Installation <a name="installation"></a>

### Procedures <a name="procedures"></a>

1. At top right of this page, click on **Use this template** > **Create a new repository**.
2. Clone new repository.
3. Change `name` and `description` in package.json => **Auto synchronize with manifest**
4. Run `yarn` or `npm i` (check your node version >= 20)
5. Run `yarn dev` or `npm run dev`
6. Load Extension on Chrome
   1. Open - Chrome browser
   2. Access - chrome://extensions
   3. Check - Developer mode
   4. Find - Load unpacked extension
   5. Select - `dist` folder in this project (after dev or build)
7. If you want to build in production, Just run `yarn build` or `npm run build`.

## Screenshots <a name="screenshots"></a>

<img width="957" alt="image" src="https://user-images.githubusercontent.com/14998939/182227580-31e390cd-386b-426a-adba-e8a31a2f303d.png">

## Documents <a name="documents"></a>

- [Vite Plugin](https://vitejs.dev/guide/api-plugin.html)
- [ChromeExtension](https://developer.chrome.com/docs/extensions/mv3/)
- [Rollup](https://rollupjs.org/guide/en/)
- [Rollup-plugin-chrome-extension](https://www.extend-chrome.dev/rollup-plugin)

## Support

If you found this template helpful and want to support, please [donate](https://boosty.to/thearturca/single-payment/donation/495699/target?share=target_link)
