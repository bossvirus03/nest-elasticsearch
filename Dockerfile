FROM elasticsearch:8.13.4

RUN elasticsearch-plugin install --batch analysis-icu
