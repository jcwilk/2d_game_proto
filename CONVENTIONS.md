# Coding Conventions

## General Principles

- **Type Safety**: Everything must be strictly typed. Avoid `any` at all costs.
- **Type-Driven Design**: Prefer modeling the domain in the type system first (clear unions, narrow interfaces, discriminated states, and precise function signatures) so correctness is enforced by the compiler.
- **Functional/Declarative Style**: Lean toward small pure functions, explicit data flow, and composition over mutation-heavy, class-centric, object-oriented patterns.
- **Consistency**: Follow existing patterns for file structure and naming.

## TypeScript

- Use `interface` for object shapes and `type` for unions/aliases.
- Enable all strict mode options in `deno.json`.
- Prefer type guards, narrowing, and better type design over type assertions.
- Avoid `as` in normal flow code. It is not forbidden, but treat it as an exception for practical edge cases when inference cannot reasonably express intent.
- If you feel forced to use repeated `as` assertions, refactor types first (e.g., introduce better domain types, discriminated unions, helper guards, or generic constraints).
