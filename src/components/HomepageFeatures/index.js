import React from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Easy to Use',

    image: require('@site/static/img/logo2.webp').default,
    isSvg: false, 
    description: (
      <>
        Общие знания
      </>
    ),
  },
  {
    title: 'GIT',
    image: require('@site/static/img/git.png').default,
    isSvg: false, 
    description: (
      <>
        Материалы по GIT
      </>
    ),
  },
  {
    title: 'Golang',
    image: require('@site/static/img/golang.png').default,
    isSvg: false, 
    description: (
      <>
        Материалы по GoLang
      </>
    ),
  },
];


function Feature({image, isSvg, title, description}) {
  const ImgComponent = image; 
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        {isSvg ? (
          <ImgComponent className={styles.featureSvg} role="img" />
        ) : (
          <img className={styles.featureImg} src={ImgComponent} alt={title} />
        )}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}