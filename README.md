# NGS Data Management System

This is a web application designed to manage **Next-Generation Sequencing (NGS)** data. It provides tools for calculations, database management, and administrative settings to streamline NGS workflows.
## 📊 Pipeline Overview

Below is a flowchart illustrating how data moves through the website:

```mermaid
graph TD;
    A[User Input 1 / 2] --> B[Calculation];
    B --> C[Database Storage];
    C --> D[Flowcell Display];
    D --> E[Final Decision];
