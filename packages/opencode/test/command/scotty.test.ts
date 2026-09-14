import { describe, expect } from "bun:test"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { Effect } from "effect"
import { Command } from "@/command"
import { testEffect } from "../lib/effect"

const it = testEffect(LayerNode.compile(LayerNode.group([Command.node])))

// `/scotty` is a built-in prompt template, so the same substitution passes that
// run over `/init` and `/review` also run over the art. Anything the template
// engine rewrites would silently mangle the drawing before it reaches the model.
// See `placeholderRegex` and `bashRegex` in src/session/prompt.ts.
const PLACEHOLDER = /\$(\d+)/g
const SHELL = /!`([^`]+)`/g

describe("Command scotty", () => {
  it.instance("registers the scotty command", () =>
    Effect.gen(function* () {
      const command = yield* Command.Service
      const scotty = yield* command.get(Command.Default.SCOTTY)

      expect(scotty).toMatchObject({
        name: "scotty",
        description: "print ASCII art of a cute Scottish terrier",
        source: "command",
      })
    }),
  )

  it.instance("lists scotty alongside the other built-in commands", () =>
    Effect.gen(function* () {
      const command = yield* Command.Service
      const names = (yield* command.list()).map((item) => item.name)

      expect(names).toContain("scotty")
      expect(names).toContain(Command.Default.INIT)
      expect(names).toContain(Command.Default.REVIEW)
    }),
  )

  it.instance("takes no arguments", () =>
    Effect.gen(function* () {
      const command = yield* Command.Service
      const scotty = yield* command.get(Command.Default.SCOTTY)

      expect(scotty?.hints).toEqual([])
      expect(scotty?.subtask).toBeUndefined()
    }),
  )

  it.instance("embeds the ascii art in the template", () =>
    Effect.gen(function* () {
      const command = yield* Command.Service
      const scotty = yield* command.get(Command.Default.SCOTTY)
      const template = yield* Effect.promise(async () => scotty!.template)

      expect(template).toContain("Scotty")
      // The art is shipped with the command rather than left to the model, so the
      // template has to carry a real multi-line drawing.
      expect(template.split("\n").filter((line) => line.trim().length > 0).length).toBeGreaterThan(8)
      expect(template).toMatch(/[/\\|_]/)
    }),
  )

  it.instance("survives template substitution untouched", () =>
    Effect.gen(function* () {
      const command = yield* Command.Service
      const scotty = yield* command.get(Command.Default.SCOTTY)
      const template = yield* Effect.promise(async () => scotty!.template)

      expect(template.match(PLACEHOLDER)).toBeNull()
      expect(template.match(SHELL)).toBeNull()
      expect(template).not.toContain("$ARGUMENTS")
    }),
  )
})
