# Dino FinOps Platform: Research & Architecture Plan

## Executive Summary

This document outlines the research findings and architecture plan for developing a world-class hosted FinOps solution for Dino's cloud resource management. The platform will be built on the **FOCUS (FinOps Open Cost & Usage Specification)** standard, incorporating best practices from leading open source projects and commercial platforms.

---

## Table of Contents

1. [FOCUS Framework Overview](#focus-framework-overview)
2. [Open Source Ecosystem](#open-source-ecosystem)
3. [Commercial Landscape Analysis](#commercial-landscape-analysis)
4. [AI-Driven FinOps Agents](#ai-driven-finops-agents)
5. [Proposed Architecture](#proposed-architecture)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Competitive Differentiators](#competitive-differentiators)

---

## FOCUS Framework Overview

### What is FOCUS?

The **FinOps Open Cost & Usage Specification (FOCUS)** is an open technical specification that normalizes billing datasets across cloud, SaaS, data center, and other technology vendors. It establishes a common format and terminology for technology billing data.

### Version History

| Version | Release Date | Key Features |
|---------|--------------|--------------|
| **1.0** | November 2023 | Initial GA covering Cloud and SaaS datasets |
| **1.1** | November 7, 2024 | Added columns for granular multi-cloud analysis, improved ETL metadata |
| **1.2** | May 29, 2025 | Cloud+ unified reporting, combining SaaS, PaaS, and Cloud in one schema |
| **1.3** | December 4, 2025 | Contract Commitment dataset, metadata completeness flags |

### FOCUS Schema Core Columns

The specification defines standardized columns across several categories:

#### Cost Metrics
- `ListUnitPrice` / `ListCost` - Public retail/market prices without discounts
- `ContractedUnitPrice` / `ContractedCost` - Prices after negotiated contractual discounts
- `EffectiveCost` - Cost after commitment discounts are amortized
- `BilledCost` - Amount invoiced

#### Resource Identification
- `ResourceId` - Unique identifier for the resource
- `ResourceName` - Human-readable resource name
- `ResourceType` - Type classification
- `ServiceName` / `ServiceCategory` - Service identification

#### Cost Allocation
- `SubAccountId` / `SubAccountName` - Account hierarchy
- `Tags` - Key-value metadata (serialized JSON per ECMA 404)
- `ChargeType` - Usage, Purchase, Adjustment, Tax

#### Feature Levels
- **Mandatory** - Required for all providers
- **Conditional** - Required under specific conditions
- **Optional** - Recommended but not required

### Cloud Provider Adoption

| Provider | FOCUS Support | Notes |
|----------|--------------|-------|
| AWS | GA (re:Invent 2024) | FOCUS 1.0+ in Cost and Usage Reports |
| Microsoft Azure | GA | Native Cost Management exports |
| Google Cloud | GA | Billing export in FOCUS format |
| Oracle Cloud | GA | OCI billing exports |
| Alibaba Cloud | Supported | Regional availability |
| Tencent Cloud | Supported | Latest cloud to adopt |
| Databricks | Supported | Platform provider |
| Grafana | Supported | Platform provider |

### Key Resources

- **Official Specification**: https://focus.finops.org/focus-specification/
- **GitHub Repository**: https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec
- **AWS Documentation**: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-0-aws.html
- **Azure Schema**: https://learn.microsoft.com/en-us/azure/cost-management-billing/dataset-schema/cost-usage-details-focus

---

## Open Source Ecosystem

### Tier 1: Core FinOps Projects

#### 1. OpenCost (CNCF Incubating)

**Repository**: https://github.com/opencost/opencost

**Description**: Vendor-neutral Kubernetes cost monitoring specification and implementation.

**Key Features**:
- Real-time cost allocation by namespace, deployment, service, container
- Dynamic asset pricing via AWS, Azure, GCP billing APIs
- GPU, CPU, memory, storage, and network cost tracking
- Multi-cluster and multi-cloud visibility
- MCP (Model Context Protocol) server for AI agent integration
- FOCUS specification alignment

**Architecture**:
- Golang implementation
- Prometheus integration
- Runs in-cluster for full control and privacy
- Plugin framework for extensibility

**Use Case for Dino**: Foundation for Kubernetes workload cost monitoring

---

#### 2. Infracost

**Repository**: https://github.com/infracost/infracost

**Description**: Shift-left cost estimation for Infrastructure as Code (Terraform).

**Key Features**:
- Pre-deployment cost estimates
- Pull request cost annotations
- FinOps best practice checks
- VS Code extension
- Terraform Cloud Run Tasks integration
- AutoFix for cost issues

**Supported Providers**: AWS, Azure, Google Cloud

**Use Case for Dino**: Infrastructure cost prediction before deployment

---

#### 3. Cloud Custodian (CNCF)

**Repository**: https://github.com/cloud-custodian/cloud-custodian

**Description**: Stateless rules engine for cloud policy enforcement.

**Key Features**:
- YAML-based DSL for policy creation
- Security, governance, and FinOps policies
- Off-hours scheduling for cost reduction
- Resource tagging enforcement
- Multi-cloud support (AWS, Azure, GCP, K8s)
- Serverless deployment option

**Use Case for Dino**: Automated policy enforcement and cost governance

---

#### 4. Komiser

**Repository**: https://github.com/tailwarden/komiser

**Description**: Multi-cloud asset inventory and cost optimization.

**Key Features**:
- Comprehensive asset inventory
- Idle/underutilized resource detection
- Untagged resource reporting
- Advanced filtering and custom views
- Integration with OpenCost, OptScale, Cloud Custodian

**Use Case for Dino**: Resource discovery and waste identification

---

#### 5. Goldilocks

**Repository**: https://github.com/FairwindsOps/goldilocks

**Description**: Kubernetes resource right-sizing recommendations.

**Key Features**:
- Workload usage pattern analysis
- Resource request/limit recommendations
- Over/under-provisioning detection
- Dashboard for visualization

**Use Case for Dino**: Kubernetes right-sizing automation

---

#### 6. OptScale

**Repository**: https://github.com/hystax/optscale

**Description**: Full-featured open source FinOps platform.

**Key Features**:
- AWS, Azure, GCP, Alibaba Cloud support
- Kubernetes cost management
- ML/AI cost optimization
- Resource pool management
- TTL policies

**Use Case for Dino**: Reference architecture for full platform

---

#### 7. Karpenter

**Repository**: https://github.com/kubernetes-sigs/karpenter

**Description**: AWS open-source cluster autoscaler.

**Key Features**:
- Just-in-time node provisioning
- Direct pod-based scaling decisions
- Intelligent instance selection
- Spot instance support

**Use Case for Dino**: Kubernetes autoscaling cost optimization

---

### Open Source Integration Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dino FinOps Platform                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  OpenCost   │  │  Infracost  │  │   Komiser   │             │
│  │ (K8s Costs) │  │  (IaC Est.) │  │ (Inventory) │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   FOCUS Data Layer    │                          │
│              │  (Normalized Schema)  │                          │
│              └───────────┬───────────┘                          │
│                          │                                      │
│  ┌───────────────────────┼───────────────────────┐             │
│  │                       ▼                       │             │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │             │
│  │  │Cloud Cust.  │  │ Goldilocks  │  │Karpent.│ │             │
│  │  │ (Policies)  │  │(Right-size) │  │(Scale) │ │             │
│  │  └─────────────┘  └─────────────┘  └────────┘ │             │
│  └───────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Commercial Landscape Analysis

### Leading Platforms Comparison

| Platform | Strengths | Weaknesses | Pricing |
|----------|-----------|------------|---------|
| **Kubecost** | K8s-native, OpenCost-based, self-hosted option | K8s-only focus, free tier uses list prices | $449+/mo (100 nodes) |
| **CloudZero** | Business context mapping, multi-source ingestion | Complex setup, enterprise pricing | Enterprise |
| **CloudHealth** | Governance framework, enterprise features | Legacy architecture, weak cost allocation | Enterprise |
| **Vantage** | Clean UI, fast onboarding, AI agent | Newer platform, still maturing | Tiered |
| **Datadog CCM** | APM integration, FOCUS support | Add-on to existing Datadog | % of spend |
| **IBM Cloudability** | FOCUS beta support, enterprise features | Slower innovation | Enterprise |
| **CoreStack** | FOCUS-compliant dashboards, governance | Less known | Enterprise |

### Key Differentiators to Target

1. **Native FOCUS 1.3 Support** - Full spec compliance from day one
2. **AI-First Architecture** - Built for LLM/agent integration
3. **Multi-Cloud + SaaS + K8s** - Unified view across all spend
4. **Real-Time Processing** - Streaming architecture vs batch
5. **Developer Experience** - GitOps integration, IaC cost gates
6. **Open Source Core** - Transparent, extensible, community-driven

---

## AI-Driven FinOps Agents

### The AI FinOps Opportunity

Gartner predicts **$482 billion in cloud waste by 2025**. AI agents represent a paradigm shift from reactive dashboards to proactive, autonomous optimization.

### Agentic FinOps Capabilities

| Capability | Traditional Automation | AI Agent |
|------------|----------------------|----------|
| Anomaly Detection | Rule-based alerts | Context-aware pattern recognition |
| Right-sizing | Static thresholds | Predictive workload analysis |
| Commitment Planning | Historical lookback | Multi-scenario simulation |
| Cost Attribution | Tag-based allocation | Intelligent inference |
| Remediation | Manual or scripted | Autonomous with rollback |

### Current AI FinOps Implementations

#### Vantage FinOps Agent
- Slack-native interface
- Natural language cost queries
- MCP-connected to cloud cost data
- Can execute commitment purchases
- Future: Infrastructure changes, GitHub PRs

#### AWS Q for Cost Optimization
- Native AWS integration
- Spending anomaly explanation
- Resource tagging automation

#### Azure AI Foundry Agent Service
- Multi-agent orchestration
- Enterprise-grade scaling

### Proposed AI Agent Architecture for Dino

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dino AI FinOps Agent                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Agent Orchestrator                     │   │
│  │              (Claude / GPT-4 / Llama 3)                  │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│           ┌─────────────────┼─────────────────┐                │
│           ▼                 ▼                 ▼                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │  Cost       │   │  Anomaly    │   │  Optimizer  │          │
│  │  Analyst    │   │  Detective  │   │  Agent      │          │
│  │  Agent      │   │  Agent      │   │             │          │
│  └─────────────┘   └─────────────┘   └─────────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Tool Layer (MCP)                      │   │
│  ├─────────────┬─────────────┬─────────────┬───────────────┤   │
│  │ FOCUS Query │ Cloud APIs  │ K8s API     │ IaC Scanner   │   │
│  │ Engine      │ (AWS/GCP/Az)│ (OpenCost)  │ (Infracost)   │   │
│  └─────────────┴─────────────┴─────────────┴───────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Action Layer                           │   │
│  ├─────────────┬─────────────┬─────────────┬───────────────┤   │
│  │ Slack/Teams │ GitHub PRs  │ Terraform   │ Cloud CLI     │   │
│  │ Notify      │ Auto-create │ Apply       │ Execute       │   │
│  └─────────────┴─────────────┴─────────────┴───────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Use Cases

1. **Natural Language Cost Exploration**
   - "What was our AI inference spend last month by team?"
   - "Why did storage costs spike on Tuesday?"

2. **Proactive Optimization**
   - Autonomous right-sizing recommendations
   - Commitment purchase suggestions with ROI analysis
   - Idle resource cleanup proposals

3. **Guardrails & Governance**
   - Budget breach predictions
   - Anomaly detection with root cause analysis
   - Policy violation alerts

4. **Action Execution**
   - One-click or autonomous remediation
   - PR creation for IaC changes
   - Rollback capability for safety

---

## Proposed Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Dino FinOps Platform                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                       Presentation Layer                          │ │
│  ├──────────────┬──────────────┬──────────────┬─────────────────────┤ │
│  │   Web App    │   Slack Bot  │   CLI Tool   │   API Gateway       │ │
│  │   (React)    │   (AI Agent) │   (dino-cli) │   (REST/GraphQL)    │ │
│  └──────────────┴──────────────┴──────────────┴─────────────────────┘ │
│                                    │                                   │
│  ┌─────────────────────────────────▼─────────────────────────────────┐ │
│  │                        AI/Agent Layer                             │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │ │
│  │  │   Claude    │  │   OpenAI    │  │   Llama 3   │               │ │
│  │  │   (Primary) │  │  (Fallback) │  │   (Batch)   │               │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │              MCP Server (Model Context Protocol)            │ │ │
│  │  │  • FOCUS Query Tool   • Cloud Provider Tools               │ │ │
│  │  │  • Kubernetes Tool    • Infrastructure Tool                │ │ │
│  │  │  • Action Executor    • Knowledge Base                     │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                    │                                   │
│  ┌─────────────────────────────────▼─────────────────────────────────┐ │
│  │                     Analytics & Query Layer                       │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │ │
│  │  │  Query Engine   │  │  Anomaly Engine  │  │ Recommendation  │  │ │
│  │  │  (SQL/GraphQL)  │  │  (ML-based)      │  │ Engine          │  │ │
│  │  └─────────────────┘  └──────────────────┘  └─────────────────┘  │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │           Real-Time Processing (Apache Flink)               │ │ │
│  │  │  • Stream aggregation   • Enrichment                        │ │ │
│  │  │  • Budget monitoring    • Anomaly detection                 │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                    │                                   │
│  ┌─────────────────────────────────▼─────────────────────────────────┐ │
│  │                         Data Layer                                │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │               FOCUS Data Warehouse                          │ │ │
│  │  │  • Normalized billing data (FOCUS 1.3 schema)              │ │ │
│  │  │  • Provider-specific extended columns (x_*)                │ │ │
│  │  │  • Historical retention (configurable)                     │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐ │ │
│  │  │  TimeSeries   │  │   Vector DB   │  │   Object Storage      │ │ │
│  │  │  (Metrics)    │  │ (Embeddings)  │  │   (Raw Billing)       │ │ │
│  │  └───────────────┘  └───────────────┘  └───────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                    │                                   │
│  ┌─────────────────────────────────▼─────────────────────────────────┐ │
│  │                       Ingestion Layer                             │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │  ┌───────────────────────────────────────────────────────────┐   │ │
│  │  │            Apache Kafka (Event Streaming)                 │   │ │
│  │  └───────────────────────────────────────────────────────────┘   │ │
│  │                                                                   │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │ │
│  │  │   AWS   │  │  Azure  │  │   GCP   │  │   K8s   │  │  SaaS   │ │ │
│  │  │Connector│  │Connector│  │Connector│  │OpenCost │  │Connector│ │ │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack Recommendations

#### Ingestion Layer
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Message Broker | Apache Kafka / Redpanda | High-throughput, reliable streaming |
| AWS Connector | Custom (CUR S3 polling) | Native AWS billing format |
| Azure Connector | Custom (Cost Management API) | REST API integration |
| GCP Connector | Custom (BigQuery Export) | BigQuery billing export |
| K8s Connector | OpenCost | CNCF standard, FOCUS-aligned |
| SaaS Connector | Custom + webhooks | Provider-specific integrations |

#### Data Layer
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Data Warehouse | ClickHouse / Apache Druid | Optimized for OLAP, time-series |
| TimeSeries DB | TimescaleDB / InfluxDB | Real-time metrics |
| Vector DB | Qdrant / Pinecone | AI agent embeddings |
| Object Storage | S3 / R2 / MinIO | Raw billing archive |

#### Analytics Layer
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Stream Processing | Apache Flink | Low-latency, stateful processing |
| Anomaly Detection | Prophet / isolation forests | Time-series anomaly detection |
| Query Engine | DuckDB / Presto | SQL over data lake |

#### AI Layer
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Primary LLM | Claude 3.5 Sonnet | Strong reasoning, tool use |
| Fallback LLM | OpenAI GPT-4 | Wide compatibility |
| Batch LLM | Llama 3 70B | Cost-effective batch processing |
| Agent Framework | LangGraph / Claude MCP | Agentic orchestration |

#### Presentation Layer
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Web App | React + Vite + Recharts | Modern, performant |
| API | Hono / Fastify | Edge-ready, fast |
| CLI | Node.js / Rust | Developer-friendly |
| Slack Bot | Slack Bolt | Native Slack integration |

---

## Implementation Roadmap

### Phase 1: Foundation (MVP)

**Objective**: FOCUS-compliant data ingestion and basic visualization

**Deliverables**:
- [ ] FOCUS 1.3 schema implementation
- [ ] AWS CUR connector with FOCUS transformation
- [ ] Basic web dashboard (cost by service, account, time)
- [ ] PostgreSQL/ClickHouse data warehouse
- [ ] REST API for cost queries

**Open Source Integration**:
- OpenCost for Kubernetes cost data
- Infracost for IaC cost estimation

---

### Phase 2: Multi-Cloud & Analytics

**Objective**: Full multi-cloud support with advanced analytics

**Deliverables**:
- [ ] Azure Cost Management connector
- [ ] GCP BigQuery billing connector
- [ ] Anomaly detection engine
- [ ] Budget management and alerts
- [ ] Cost allocation rules engine
- [ ] GraphQL API

**Open Source Integration**:
- Cloud Custodian for policy enforcement
- Komiser for asset inventory

---

### Phase 3: AI Agent & Automation

**Objective**: AI-powered insights and autonomous optimization

**Deliverables**:
- [ ] Claude MCP server with FOCUS tools
- [ ] Natural language cost exploration
- [ ] Slack/Teams bot integration
- [ ] Right-sizing recommendations engine
- [ ] Commitment planning simulator
- [ ] Autonomous remediation (with approval flows)

**Open Source Integration**:
- Goldilocks for K8s right-sizing
- Karpenter integration for autoscaling

---

### Phase 4: Enterprise & Scale

**Objective**: Enterprise features and massive scale support

**Deliverables**:
- [ ] Multi-tenant architecture
- [ ] SSO/SAML integration
- [ ] Role-based access control
- [ ] SaaS billing connectors (Datadog, Snowflake, etc.)
- [ ] Custom cost allocation models
- [ ] API for third-party integrations
- [ ] Real-time streaming with Kafka/Flink

---

## Competitive Differentiators

### 1. FOCUS-Native Architecture
- Built from ground up on FOCUS 1.3 specification
- Not retrofitted—schema-first design
- Automatic support for new FOCUS versions

### 2. AI-First, Not AI-Added
- Agent architecture is core, not a feature
- MCP-native tool integration
- Multi-LLM support (Claude, GPT-4, Llama)

### 3. Open Source Core
- Transparent pricing and algorithms
- Community-driven development
- Self-hosted option available

### 4. Real-Time Processing
- Streaming architecture (Kafka + Flink)
- Near-instant anomaly detection
- Live budget monitoring

### 5. Developer Experience
- GitOps-native workflows
- PR-based cost gates via Infracost
- CLI-first design
- IaC integration

### 6. Unified View
- Cloud + Kubernetes + SaaS + AI spend
- Single pane of glass
- Cross-provider allocation

### 7. Autonomous Optimization
- Beyond recommendations—takes action
- Safe rollback mechanisms
- Approval workflows for governance

---

## Appendix: Research Sources

### FOCUS Specification
- [FOCUS Official Site](https://focus.finops.org/)
- [FOCUS Specification v1.3](https://focus.finops.org/focus-specification/)
- [FOCUS GitHub Repository](https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec)
- [AWS FOCUS Documentation](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-0-aws.html)
- [Azure FOCUS Schema](https://learn.microsoft.com/en-us/azure/cost-management-billing/dataset-schema/cost-usage-details-focus)

### Open Source Projects
- [OpenCost](https://github.com/opencost/opencost)
- [Infracost](https://github.com/infracost/infracost)
- [Cloud Custodian](https://github.com/cloud-custodian/cloud-custodian)
- [Komiser](https://github.com/tailwarden/komiser)
- [OptScale](https://github.com/hystax/optscale)
- [Goldilocks](https://github.com/FairwindsOps/goldilocks)
- [Karpenter](https://github.com/kubernetes-sigs/karpenter)

### Commercial Platform References
- [CloudZero](https://www.cloudzero.com/)
- [Vantage](https://www.vantage.sh/)
- [Kubecost](https://www.kubecost.com/)
- [CoreStack](https://www.corestack.io/)

### AI FinOps
- [FinOps Foundation - FinOps for AI](https://www.finops.org/wg/finops-for-ai-overview/)
- [Vantage FinOps Agent](https://www.vantage.sh/blog/finops-ai-agent)
- [FinOps X 2025 AI Announcements](https://www.finops.org/insights/finops-x-2025-cloud-announcements/)

### Architecture References
- [FinOps Foundation Framework](https://www.finops.org/framework/)
- [FinOps Data Ingestion Capability](https://www.finops.org/framework/capabilities/data-ingestion/)
- [Microsoft FinOps Hubs](https://learn.microsoft.com/en-us/cloud-computing/finops/toolkit/hubs/finops-hubs-overview)

---

*Document Version: 1.0*
*Created: January 2026*
*Author: Claude (Research Agent)*
