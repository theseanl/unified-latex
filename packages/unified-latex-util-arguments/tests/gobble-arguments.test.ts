import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "../../unified-latex-util-argspec";
import { gobbleArguments } from "../libs/gobble-arguments";
import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";
import { arg, s, SP } from "@unified-latex/unified-latex-builder";
import { strToNodesMinimal } from "../../test-common";
import { scan } from "@unified-latex/unified-latex-util-scan";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-arguments", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("can gobble mandatory arguments", () => {
        let argspec = parseArgspec("m m");
        value = "{val}x x";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "val" }],
                    openMark: "{",
                    closeMark: "}",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "x" }],
                    openMark: "{",
                    closeMark: "}",
                },
            ],
            nodesRemoved: 2,
        });
        expect(nodes).toEqual([
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);

        value = "val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "val" }],
                    openMark: "{",
                    closeMark: "}",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "x" }],
                    openMark: "{",
                    closeMark: "}",
                },
            ],

            nodesRemoved: 3,
        });
        expect(nodes).toEqual([
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);
    });

    it("can gobble arguments with custom argument parser", () => {
        /**
         * Unconditionally take the first node as an argument.
         */
        function simpleParser(
            nodes: Ast.Node[],
            macroPos: number
        ): { args: Ast.Argument[]; nodesRemoved: number } {
            const args: Ast.Argument[] = [arg(nodes.shift()!)];
            return { args, nodesRemoved: 1 };
        }

        let nodes = strToNodesMinimal("{val}x x");
        expect(gobbleArguments(nodes, simpleParser)).toEqual({
            args: [arg([{ type: "group", content: [s("val")] }])],
            nodesRemoved: 1,
        });
        expect(nodes).toEqual([s("x"), SP, s("x")]);

        /**
         * Scan until an `"x"` is found.
         */
        function complexParser(
            nodes: Ast.Node[],
            macroPos: number
        ): { args: Ast.Argument[]; nodesRemoved: number } {
            const l = scan(nodes, "x", { startIndex: macroPos });
            if (l == null) {
                return {
                    args: [arg([], { openMark: "", closeMark: "" })],
                    nodesRemoved: 0,
                };
            }
            const args: Ast.Argument[] = [
                arg(nodes.splice(macroPos, l - macroPos)),
            ];
            return { args, nodesRemoved: l - macroPos };
        }
        nodes = strToNodesMinimal("{val} a b x x");
        expect(gobbleArguments(nodes, complexParser)).toEqual({
            args: [
                arg([
                    { type: "group", content: [s("val")] },
                    SP,
                    s("a"),
                    SP,
                    s("b"),
                    SP,
                ]),
            ],
            nodesRemoved: 6,
        });
        expect(nodes).toEqual([s("x"), SP, s("x")]);
    });
});
