import React from "react";
import styles from "./StoreCards.module.css";

interface StoreItem {
  title: string;
  price: string;
  imageUrl: string;
  productUrl: string;
}

const StoreCards: React.FC<{ items: StoreItem[] }> = ({ items }) => (
  <div className={styles.grid}>
    {items.map((item) => (
      <a
        key={item.productUrl}
        href={item.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.card}
      >
        <div className={styles.imgWrapper}>
          <img
            src={item.imageUrl}
            alt={item.title}
            className={styles.img}
            loading="lazy"
          />
        </div>
        <div className={styles.info}>
          <span className={styles.title}>{item.title}</span>
          <span className={styles.price}>{item.price}</span>
        </div>
        <span className={styles.cta}>Buy →</span>
      </a>
    ))}
  </div>
);

export default StoreCards;
