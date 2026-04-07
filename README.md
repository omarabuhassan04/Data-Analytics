# Data Analytics Project

This project applies data analytics techniques across two real-world case studies: agricultural biomass prediction and e-commerce sales forecasting. It covers descriptive statistics, data visualization, feature selection, and predictive modeling using Linear Regression, Decision Tree, Exponential Smoothing, and LSTM. Optimization methods including Genetic Algorithm (GA), Particle Swarm Optimization (PSO), and Linear Programming are also implemented and compared using MAE and R² metrics.

## Case Study 1 — Agricultural Biomass Analysis

**Dataset:** Environmental and vegetation data including Biomass, Dry Matter (DM), TEMP_MAX, TEMP_MIN, Rainfall, Solar Radiation, Wind Speed, Humidity, and vegetation indices (NDVI, EVI, LAI, SAVI).

**Techniques:**
- Descriptive statistics (central tendency, dispersion, percentiles)
- Correlation analysis and contingency tables
- Feature selection: SelectKBest and Random Forest Importance
- Forecasting: Linear Regression, Decision Tree, Exponential Smoothing, LSTM
- Optimization: Genetic Algorithm (GA) and Particle Swarm Optimization (PSO) for Environmental Suitability Index (ESI)
- Model evaluation using MAE and R²

## Case Study 2 — E-Commerce Sales Prediction

**Dataset:** E-commerce data including Units Sold, Price, Discount, Marketing Spend, Product Category, and Customer Segment.

**Techniques:**
- Descriptive statistics with Z-score outlier detection
- Visualizations: histogram, boxplot, violin plot, scatter plot, pie chart, heatmap
- Feature selection: SelectKBest and Random Forest Importance
- Predictive models: Linear Regression, Decision Tree, Exponential Smoothing
- Optimization: Linear Programming and Genetic Algorithm (GA)
- Model evaluation using MAE and R²

## Tools & Libraries

`Python` · `Pandas` · `NumPy` · `Matplotlib` · `Seaborn` · `Scikit-learn` · `Statsmodels` · `TensorFlow/Keras` · `SciPy`

## Repository Structure

```
Data Analytics/
├── analytics (1).ipynb        # Agricultural Biomass Analysis
├── final_final_code.ipynb     # E-Commerce Sales Prediction
├── Data Analytics.docx        # Project report
├── final analytics.docx       # Final report
└── README.md
```
