
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Полезный сайт',
  tagline: 'Здесь буду собраны обучающие материалы которые я посчитал полезными',
  favicon: 'img/favicon.ico',

  future: {
    v4: true, 
  },

  url: 'https://maxim-belyi.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/MyDocs/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'maxim-belyi', // Usually your GitHub org/user name.
  projectName: 'MyDocs', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Maxim-Belyi/MyDocs/tree/main/',
        },
        blog: {
          showReadingTime: false,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Maxim-Belyi',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'git', // Уникальный ID для секции Git
        path: 'Git', // Папка с контентом
        routeBasePath: 'git', // URL будет site.com/git/..
        sidebarPath: './sidebarsGit.js', // Путь к файлу с боковым меню для Git
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'golang', // Уникальный ID для секции Golang
        path: 'Golang', // Папка с контентом
        routeBasePath: 'golang', // URL будет site.com/golang/..
        sidebarPath: './sidebarsGolang.js', // Путь к файлу с боковым меню для Golang
      },
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/logo2.webp',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Knowledge hub',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo2.webp',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'База',
          },
     
          {to: '/golang/intro', label: 'GoLang', position: 'left'},
      
          {to: '/git/intro', label: 'Git', position: 'left'},
          {
            href: 'https://github.com/Maxim-Belyi',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {  
        copyright: `Copyright © ${new Date().getFullYear()} Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
