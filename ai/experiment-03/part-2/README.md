React Native + Node.js + OpenAI

This experiment builds on Experiment 03 — Part 1: Tool Calling and extends the implementation into a more advanced multi-tool AI workflow.

The application is an AI Order Assistant that can search orders, retrieve order details, check order status, and cancel eligible orders.

What We Build

The application consists of two parts:

React Native / Expo mobile application
Node.js / Express / TypeScript backend

The backend communicates with OpenAI and is responsible for executing application-defined tools.

Example:

User:

Find Alex's orders and give me the full details of the order that is arriving today.

        ↓

OpenAI:
searchOrders
{ "customerName": "Alex" }

        ↓

Backend:
executeTool()

        ↓

Order Service:
searchOrders("Alex")

        ↓

OpenAI:
getOrderDetails
{ "orderId": "12345" }

        ↓

Backend:
executeTool()

        ↓

Order Service:
getOrderDetails("12345")

        ↓

OpenAI:
Final response

        ↓

React Native
Core Concept

The most important concept in this experiment is:

The AI decides which tool it needs. The application executes the tool.

Part 2 extends the Tool Calling workflow with:

Multiple tools
Multiple tool calls
Tool chaining
Multi-round tool execution
Action tools
Backend validation and business rules

For action tools:

AI can request an action. The backend decides whether that action is allowed.

Architecture
┌─────────────────┐
│  React Native   │
│     Mobile      │
└────────┬────────┘
         │
         │ POST /api/chat
         ▼
┌─────────────────┐
│ Node.js /       │
│ Express Backend │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     OpenAI      │
└────────┬────────┘
         │
         │ function_call
         ▼
┌─────────────────┐
│  executeTool()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Order Service  │
└────────┬────────┘
         │
         ▼
      Order Data
         │
         │ function_call_output
         ▼
┌─────────────────┐
│     OpenAI      │
└────────┬────────┘
         │
         ▼
     Final response
         │
         ▼
┌─────────────────┐
│  React Native   │
└─────────────────┘
Project Structure
part-2/
├── mobile/
│
├── server/
│   ├── src/
│   │   ├── ai/
│   │   │   ├── openai.ts
│   │   │   └── runToolCalling.ts
│   │   │
│   │   ├── data/
│   │   │   └── orders.ts
│   │   │
│   │   ├── services/
│   │   │   └── orderService.ts
│   │   │
│   │   ├── tools/
│   │   │   ├── orderTools.ts
│   │   │   └── toolExecutor.ts
│   │   │
│   │   └── index.ts
│
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
Backend Responsibilities

The backend is responsible for:

Receiving the user's prompt.
Sending the prompt and available tools to OpenAI.
Reading the model's tool calls.
Executing the requested application functions.
Validating tool arguments.
Applying business rules.
Sending tool results back to OpenAI.
Continuing the workflow when additional tools are required.
Returning the final AI response to React Native.
Available Tools
getOrderStatus

Returns:

Order ID
Current order status
Estimated delivery
getOrderDetails

Returns:

Customer
Item
Quantity
Total
Status
Estimated delivery
searchOrders

Searches for orders belonging to a customer.

Example:

Find all orders for Alex.
cancelOrder

Cancels an order when the backend business rules allow it.

Example:

Cancel order 12348.

An order that is already shipped or out for delivery cannot be cancelled.

Tool Chaining

Part 2 demonstrates how one tool result can lead to another tool call.

Example:

Find Alex's orders and give me the full details of the order that is arriving today.

The AI can first request:

searchOrders

The result identifies the order arriving today.

The AI can then request:

getOrderDetails

This allows the AI to complete multi-step requests dynamically.

Multiple Tool Calls

The AI can request multiple tools in the same round.

Example:

Give me the status of order 12345 and the complete details of order 12346.

The AI can request:

getOrderStatus
getOrderDetails

The backend executes both tools and sends the results back to OpenAI.

Multi-Round Tool Calling

Tool execution can continue across multiple rounds.

TOOL ROUND 1
      ↓
Tool Result
      ↓
TOOL ROUND 2
      ↓
Tool Result
      ↓
FINAL RESPONSE

The implementation supports a maximum of 5 tool rounds.

Action Tools

cancelOrder demonstrates an action-oriented tool.

The AI can request an order cancellation, but the backend determines whether the operation is allowed.

AI
 ↓
cancelOrder
 ↓
Backend validation
 ↓
Business rule
 ↓
Success / Rejection

This keeps application logic and business rules under backend control.

Backend Setup

Navigate to the server:

cd server

Install dependencies:

npm install

Create a .env file:

OPENAI_API_KEY=your_openai_api_key_here

Start the development server:

npm run dev

The server runs on:

http://localhost:3000
Test the Backend
Health Check
curl http://localhost:3000/health
Search Orders
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Find all orders for Alex."}'
Tool Chaining
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Find Alex'\''s orders and give me the full details of the order that is arriving today."}'
Cancel Order
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Cancel order 12348."}'
Run the Mobile Application

Navigate to the mobile application:

cd mobile

Start Expo:

npx expo start

The mobile application sends the user's request to:

POST /api/chat

The backend handles the complete Tool Calling workflow.

Security

The OpenAI API key belongs on the backend.

The React Native application should not contain the OpenAI API key.

Use this architecture:

React Native
     ↓
Your Backend
     ↓
OpenAI

Not:

React Native
     ↓
OpenAI API directly

The .env file should never be committed to Git.

What We Learned

This experiment covers:

Multiple application tools
Tool selection
Multiple tool calls
Tool chaining
Multi-round Tool Calling
Action tools
Argument validation
Backend business rules
React Native integration
Server-side API key security
Keeping application logic under backend control
Experiment Status

Experiment 03 — Part 2: Completed

Next

The next experiment will build on these Tool Calling concepts and explore another practical AI application pattern.

About Harihar Code Studio

Harihar Code Studio focuses on practical software engineering tutorials covering:

React Native
Mobile Engineering
Artificial Intelligence
LLM integrations
AI architecture
Developer tools
Production engineering

The goal is to understand not only how to implement a feature, but also the architecture and engineering decisions behind it.