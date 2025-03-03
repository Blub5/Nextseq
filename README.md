# NGS Data Management System

This is a web application designed to manage **Next-Generation Sequencing (NGS)** data. It provides tools for calculations, database management, and administrative settings to streamline NGS workflows.

## 📊 Pipeline Overview

This flowchart illustrates how users interact with the website:

```mermaid
graph TD;
    A[Start: User Creates/Edits Run] --> B[User Adds/Updates Rows];
    B --> C[Data Submitted to Database];
    C --> D[User Proceeds to NLP];
    D --> E[User Inputs Data];
    E --> F[Calculations Performed];
    F --> G[Final Data Submitted];
    G --> H[Results Displayed on Website];
