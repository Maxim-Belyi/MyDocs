
import {themes as prismThemes} from 'prism-react-renderer';
// import docsearch from '@docsearch/js';
// import '@docsearch/css';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Полезный сайт',
  tagline: 'Здесь будут собраны обучающие материалы, которые я посчитал полезными',
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

        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      }),
    ],
    
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'git', 
        path: 'Git', 
        routeBasePath: 'git', 
        sidebarPath: './sidebarsGit.js', 
      },
    ],
        [
      '@docusaurus/plugin-content-docs',
      {
        id: 'sqlSidebar', 
        path: 'SQL', 
        routeBasePath: 'sql', 
        sidebarPath: './sidebarsSQL.js', 
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'golang', 
        path: 'Golang', 
        routeBasePath: 'golang', 
        sidebarPath: './sidebarsGolang.js', 
      },
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({

      algolia: {
      appId: 'Z8AH77ITKY',
      apiKey: '589b5719b9ed7f17a020d64831c3fa3e',
      indexName: 'useful documentation',
      contextualSearch: true,
    },
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
            sidebarId: 'sqlSidebar',
            position: 'left',
            to: '/sql/intro',
            label: 'SQL',
          },
        //  {type:'docSidebar', sidebarId: 'sqlSidebar', to: '/sql/intro', label:'SQL', position:'left'},
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
