# WooCommerce Category Architecture - AME Bazaar

This document contains the production-grade category and sub-category hierarchy designed for AME Bazaar. It is programmatically bootstrapped and maintained on startup.

---

## Category Hierarchy & Slug Index

### 1. Men Wear (`mens-wear`)
- **Formal Shirts** (`men-formal-shirts`)
- **Casual T-Shirts** (`men-casual-tshirts`)
- **Jeans & Trousers** (`men-jeans-trousers`)
- **Ethnic Wear** (`men-ethnic-wear`)
- **Winter Wear** (`men-winter-wear`)

### 2. Women Wear (`womens-wear`)
- **Kurtis & Suits** (`women-kurtis-suits`)
- **Daily Wear & Bottoms** (`women-daily-wear`)
- **Nightwear & Lounge** (`women-nightwear`)
- **Winter Wear** (`women-winter-wear`)

### 3. Boys Wear (`boys-wear`)
- **Shirts & Tees** (`boys-tops`)
- **Jeans & Shorts** (`boys-bottoms`)
- **Ethnic Wear** (`boys-ethnic`)
- **Winter Wear** (`boys-winter`)

### 4. Girls Wear (`girls-wear`)
- **Dresses & Frocks** (`girls-dresses-frocks`)
- **Tops & Tees** (`girls-tops`)
- **Leggings & Jeans** (`girls-bottoms`)
- **Ethnic Wear** (`girls-ethnic`)
- **Winter Wear** (`girls-winter`)

### 5. Sarees (`sarees`)
- **Silk Sarees** (`silk-sarees`)
- **Georgette & Rayon** (`georgette-rayon-sarees`)
- **Daily Wear Sarees** (`printed-daily-sarees`)
- **Designer & Festive** (`designer-festive-sarees`)

### 6. Accessories (`accessories`)
- **Belts & Wallets** (`gents-belts-wallets`)
- **Socks & Handkerchiefs** (`socks-handkerchiefs`)
- **Winter Essentials** (`winter-accessories`)
- **School Uniforms** (`school-uniform-accessories`)

### 7. Footwear (`footwear`)
- **Daily Sandals & Slippers** (`daily-sandals`)
- **Formal Shoes** (`formal-shoes`)
- **Casual Sneakers** (`casual-sneakers`)
- **Kids Footwear** (`kids-footwear`)

### 8. Tailoring Services (`tailoring`)
- **Gents Stitching** (`custom-gents-stitching`)
- **Ladies Stitching** (`custom-ladies-stitching`)
- **Alteration Service** (`garment-sizing-alterations`)

---

## Key Benefits of this Hierarchy

1. **SEO Optimized Slugs**: Simple, lowercase, hyphenated slugs targeting key local search phrases (e.g. `men-formal-shirts`, `women-kurtis-suits`, `girls-dresses-frocks`).
2. **Breadcrumb Friendly**: The parent-child relationships map logical categories so breadcrumbs render cleanly (e.g. `Home > Men Wear > Formal Shirts`).
3. **AI Search & Discoverability Ready**: Grouping products into sub-niches allows search engines and LLMs to easily crawls specific segments.
4. **No Empty Placeholder Products**: Created the taxonomy structure only, leaving the database clean of sample product data.
