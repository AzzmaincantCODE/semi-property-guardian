# Semi-Property Guardian System Flowchart

## Main System Flow

```mermaid
flowchart TD
    A[User Login] --> B[Dashboard]
    B --> C{Select Module}
    
    C -->|Inventory| D[Inventory Management]
    C -->|Property Cards| E[Property Cards Annex]
    C -->|Custodian Slips| F[Custodian Slips Annex]
    C -->|Reports| G[Reports Generator]
    C -->|Lookups| H[Lookup Tables]
    
    %% Inventory Flow
    D --> D1[Add New Item]
    D1 --> D2[Select Category: Semi-Expendable]
    D2 --> D3[Select Sub-Category]
    D3 -->|Small Value ≤₱5,000| D4[Generate SPLV-YYYY-MM-NNNN]
    D3 -->|High Value >₱5,000| D5[Generate SPHV-YYYY-MM-NNNN]
    D4 --> D6[Fill Item Details]
    D5 --> D6
    D6 --> D7[Save to Database]
    D7 --> D8[Item Available for Assignment]
    
    %% Property Cards Flow
    E --> E1[Select Available Item]
    E1 --> E2[Auto-fill Entity Name & Fund Cluster]
    E2 --> E3[Create Property Card]
    E3 --> E4[Generate Property Card Entries]
    E4 --> E5[Property Card Ready]
    
    %% Custodian Slips Flow
    F --> F1[Create Custodian Slip - Draft]
    F1 --> F2[Select Custodian & Items]
    F2 --> F3[Assign Items to Custodian]
    F3 --> F4[Slip Status: Draft]
    F4 --> F5[Confirm Slip]
    F5 --> F6[Slip Status: Issued]
    F6 --> F7[Items Marked as Assigned]
    
    %% Reports Flow
    G --> G1[Select Report Type]
    G1 -->|Property Cards| G2[Semi-Expendable Property Card Report]
    G1 -->|Custodian Slips| G3[Inventory Custodian Slip Report]
    G1 -->|Physical Count| G4[Physical Count Report]
    G1 -->|Loss Report| G5[Loss Report]
    G2 --> G6[Generate PDF Report]
    G3 --> G6
    G4 --> G6
    G5 --> G6
    
    %% Lookups Flow
    H --> H1[Manage Lookup Tables]
    H1 -->|Departments| H2[Add/Edit Departments]
    H1 -->|Custodians| H3[Add/Edit Custodians]
    H1 -->|Suppliers| H4[Add/Edit Suppliers]
    H1 -->|Fund Sources| H5[Add/Edit Fund Sources]
    H2 --> H6[Update Database]
    H3 --> H6
    H4 --> H6
    H5 --> H6
    
    %% Database Operations
    D7 --> DB[(Supabase Database)]
    E4 --> DB
    F7 --> DB
    H6 --> DB
    
    %% Styling
    classDef inventory fill:#e1f5fe
    classDef property fill:#f3e5f5
    classDef custodian fill:#e8f5e8
    classDef reports fill:#fff3e0
    classDef lookups fill:#fce4ec
    classDef database fill:#f5f5f5
    
    class D,D1,D2,D3,D4,D5,D6,D7,D8 inventory
    class E,E1,E2,E3,E4,E5 property
    class F,F1,F2,F3,F4,F5,F6,F7 custodian
    class G,G1,G2,G3,G4,G5,G6 reports
    class H,H1,H2,H3,H4,H5,H6 lookups
    class DB database
```

## Detailed Data Flow

```mermaid
flowchart LR
    subgraph "Inventory Creation"
        A1[User Input] --> A2[Category Selection]
        A2 --> A3[Sub-Category Selection]
        A3 --> A4[Auto-Generate Property Number]
        A4 --> A5[Fill Item Details]
        A5 --> A6[Validation]
        A6 --> A7[Save to inventory_items]
    end
    
    subgraph "Property Card Creation"
        B1[Select Inventory Item] --> B2[Auto-fill Entity Name]
        B2 --> B3[Auto-fill Fund Cluster]
        B3 --> B4[Create Property Card]
        B4 --> B5[Generate Initial Entry]
        B5 --> B6[Save to property_cards]
    end
    
    subgraph "Custodian Assignment"
        C1[Create Custodian Slip] --> C2[Select Items]
        C2 --> C3[Assign to Custodian]
        C3 --> C4[Update Item Status]
        C4 --> C5[Create Property Card Entries]
        C5 --> C6[Mark Slip as Issued]
    end
    
    A7 --> B1
    B6 --> C1
    C6 --> B6
    
    %% Database Tables
    A7 -.-> DB1[(inventory_items)]
    B6 -.-> DB2[(property_cards)]
    C6 -.-> DB3[(custodian_slips)]
    C6 -.-> DB4[(custodian_slip_items)]
    
    classDef process fill:#e3f2fd
    classDef database fill:#f5f5f5
    
    class A1,A2,A3,A4,A5,A6,A7,B1,B2,B3,B4,B5,B6,C1,C2,C3,C4,C5,C6 process
    class DB1,DB2,DB3,DB4 database
```

## Property Number Generation Flow

```mermaid
flowchart TD
    A[User Selects Sub-Category] --> B{Sub-Category Type}
    B -->|Small Value ≤₱5,000| C[Prefix: SPLV]
    B -->|High Value >₱5,000| D[Prefix: SPHV]
    
    C --> E[Get Current Year & Month]
    D --> E
    
    E --> F[Query Database for Existing Numbers]
    F --> G{Found Existing Numbers?}
    
    G -->|Yes| H[Get Highest Sequence Number]
    G -->|No| I[Start from 0001]
    
    H --> J[Increment by 1]
    I --> K[Format: PREFIX-YYYY-MM-0001]
    J --> L[Format: PREFIX-YYYY-MM-NNNN]
    
    K --> M[Display Generated Number]
    L --> M
    
    M --> N[User Can Edit if Needed]
    N --> O[Save with Item]
    
    classDef process fill:#e8f5e8
    classDef decision fill:#fff3e0
    classDef result fill:#e1f5fe
    
    class A,E,F,H,I,J,K,L,M,N,O process
    class B,G decision
    class C,D result
```

## Custodian Slip Workflow

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Slip
    
    state Draft {
        [*] --> FillDetails: User Input
        FillDetails --> SelectItems: Add Items
        SelectItems --> ValidateItems: Check Availability
        ValidateItems --> ReadyToConfirm: All Valid
        ValidateItems --> FillDetails: Validation Failed
    }
    
    Draft --> Issued: Confirm Slip
    Draft --> [*]: Delete Slip
    
    state Issued {
        [*] --> ItemsAssigned: Update Item Status
        ItemsAssigned --> PropertyCardsCreated: Generate Entries
        PropertyCardsCreated --> CannotDelete: Protected Status
    }
    
    Issued --> [*]: System Complete
    
    note right of Draft
        - Can be edited
        - Can be deleted
        - Items not yet assigned
    end note
    
    note right of Issued
        - Cannot be edited
        - Cannot be deleted
        - Items officially assigned
        - Property cards created
    end note
```

## Database Schema Relationships

```mermaid
erDiagram
    inventory_items {
        uuid id PK
        string property_number
        string description
        string brand
        string model
        string serial_number
        string entity_name
        string category
        string sub_category
        decimal unit_cost
        string condition
        string status
        uuid supplier_id FK
        uuid fund_source_id FK
    }
    
    property_cards {
        uuid id PK
        uuid inventory_item_id FK
        string entity_name
        string fund_cluster
        string semi_expendable_property
    }
    
    property_card_entries {
        uuid id PK
        uuid property_card_id FK
        uuid custodian_slip_id FK
        string date
        string reference
        decimal receipt_qty
        decimal unit_cost
        decimal total_cost
        string issue_item_no
        decimal issue_qty
        string office_officer
        decimal balance_qty
        decimal amount
    }
    
    custodian_slips {
        uuid id PK
        string slip_number
        string custodian_name
        string designation
        string office
        string slip_status
        string date_issued
        string issued_by
        string received_by
    }
    
    custodian_slip_items {
        uuid id PK
        uuid slip_id FK
        uuid inventory_item_id FK
        uuid property_card_entry_id FK
        string property_number
        string description
        decimal quantity
        string unit
        decimal unit_cost
        decimal total_cost
    }
    
    departments {
        uuid id PK
        string name
        string code
    }
    
    custodians {
        uuid id PK
        string name
        string custodian_no
        uuid department_id FK
    }
    
    suppliers {
        uuid id PK
        string name
        string code
    }
    
    fund_sources {
        uuid id PK
        string name
        string code
    }
    
    inventory_items ||--o{ property_cards : "creates"
    property_cards ||--o{ property_card_entries : "contains"
    custodian_slips ||--o{ custodian_slip_items : "contains"
    custodian_slip_items ||--|| inventory_items : "assigns"
    custodian_slip_items ||--|| property_card_entries : "creates"
    departments ||--o{ custodians : "belongs to"
    inventory_items }o--|| suppliers : "purchased from"
    inventory_items }o--|| fund_sources : "funded by"
```

## Report Generation Flow

```mermaid
flowchart TD
    A[User Selects Report Type] --> B{Report Type}
    
    B -->|Property Card| C[Select Property Card]
    B -->|Custodian Slip| D[Select Custodian Slip]
    B -->|Physical Count| E[Select Date Range]
    B -->|Loss Report| F[Select Loss Items]
    
    C --> C1[Load Property Card Data]
    C1 --> C2[Load Property Card Entries]
    C2 --> C3[Generate Semi-Expendable Property Card PDF]
    
    D --> D1[Load Custodian Slip Data]
    D1 --> D2[Load Slip Items]
    D2 --> D3[Generate Inventory Custodian Slip PDF]
    
    E --> E1[Load Inventory Items]
    E1 --> E2[Filter by Date Range]
    E2 --> E3[Generate Physical Count Report PDF]
    
    F --> F1[Load Loss Report Data]
    F1 --> F2[Generate Loss Report PDF]
    
    C3 --> G[Download PDF]
    D3 --> G
    E3 --> G
    F2 --> G
    
    classDef report fill:#fff3e0
    classDef process fill:#e3f2fd
    classDef output fill:#e8f5e8
    
    class A,B,C,D,E,F report
    class C1,C2,D1,D2,E1,E2,F1 process
    class C3,D3,E3,F2,G output
```

This flowchart shows the complete system flow including:

1. **Main System Flow** - Overall user journey through different modules
2. **Detailed Data Flow** - How data moves between inventory, property cards, and custodian slips
3. **Property Number Generation** - The automatic numbering system based on sub-category
4. **Custodian Slip Workflow** - The two-step process (Draft → Issued)
5. **Database Schema** - Entity relationships and data structure
6. **Report Generation** - How different reports are generated

The system follows a clear progression: **Inventory Creation** → **Property Card Generation** → **Custodian Assignment** → **Report Generation**, with proper data validation and status tracking throughout.
