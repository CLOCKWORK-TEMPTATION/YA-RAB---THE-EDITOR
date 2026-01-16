# AGENTS.md

## Setup commands

- Install deps: `npm install`
- Start dev server: `npm run dev`
- Run tests: `npm run test`
- Build project: `npm run build`

## Project overview

Rabyana is a professional Arabic screenplay editor powered by AI, built with Next.js 14 and TypeScript. The project specializes in parsing and formatting Arabic screenplay text with intelligent suggestions.

## Architecture

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript in strict mode
- **AI Integration**: Genkit with Google AI (Gemini)
- **Testing**: Vitest
- **Styling**: Tailwind CSS

## Key directories

- `src/app/` - Next.js pages and layouts
- `src/engine/` - Core screenplay parsing engine
- `src/nlp/` - Arabic natural language processing
- `src/ai/` - AI suggestion modules
- `src/editor/` - Editor logic and state management

## Code style

- Use TypeScript strict mode
- Functional components and patterns
- Arabic comments for business logic
- English comments for technical implementation
- Use descriptive variable names in English
- Interface names start with 'I'

## Testing instructions

- Run unit tests: `npm run test`
- Run tests with UI: `npm run test:ui`
- Run all tests once: `npm run test:run`
- Test files should be in `src/tests/` directory
- Use Vitest for all new tests

## Development workflow

1. Create feature branch from main
2. Write tests before implementation (TDD)
3. Implement changes in TypeScript
4. Run tests and fix any issues
5. Update documentation if needed
6. Create pull request

## AI/Genkit integration

- API key required for Google AI
- Configure in environment variables
- Use `generate()` function for AI suggestions
- Keep prompts in Arabic for better results
- Temperature: 0.7 for creative suggestions

## Arabic text handling

- Use RTL direction for Arabic text
- Support Arabic diacritics (تشكيل)
- Handle Arabic punctuation correctly
- Test with various Arabic fonts

## Common tasks

- Add new screenplay element: Update classifier in `src/engine/classifier/`
- Modify parsing rules: Edit files in `src/engine/parser/`
- Add AI suggestions: Update `src/ai/suggest.ts`
- Style changes: Modify Tailwind classes

## Security notes

- Never commit API keys
- Use environment variables for secrets
- Validate all user inputs
- Sanitize Arabic text before processing
