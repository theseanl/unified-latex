import Prettier from "prettier/standalone";
import { Plugin } from "prettier";
import { prettierPluginLatex } from "../../unified-latex-prettier";
import { strToNodes } from "../../test-common";
import { parsePgfkeys } from "../libs/pgfkeys-parser";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/* eslint-env jest */

const formatter = (x: string) =>
    Prettier.format(x, {
        printWidth: 30,
        useTabs: true,
        parser: "latex-parser",
        plugins: [prettierPluginLatex as Plugin],
    });

describe("unified-latex-util-pgfkeys", () => {
    it("Pgfkeys arguments are correctly formatted", () => {
        const STRINGS = [
            {
                inStr: "\\pgfkeys{x}",
                outStr: "\\pgfkeys{x}",
            },
            {
                inStr: "\\pgfkeys{x,y}",
                outStr: "\\pgfkeys{x, y}",
            },
            {
                inStr: "\\pgfkeys{x,%comment\ny}",
                outStr: "\\pgfkeys{\n\tx, %comment\n\ty\n}",
            },
            {
                inStr: "\\pgfkeys{xreallylongkeys,yreallylong!}",
                outStr: "\\pgfkeys{\n\txreallylongkeys,\n\tyreallylong!\n}",
            },
            {
                inStr: "\\pgfkeys{  %comment\n}",
                outStr: "\\pgfkeys{ %comment\n}",
            },
            {
                inStr: "\\pgfkeys{%comment\n}",
                outStr: "\\pgfkeys{%comment\n}",
            },
            {
                inStr: "\\pgfkeys{%comment\nx}",
                outStr: "\\pgfkeys{%comment\n\tx\n}",
            },
            {
                inStr: "\\pgfkeys{,}",
                outStr: "\\pgfkeys{,}",
            },
            {
                inStr: "\\pgfkeys{,,,}",
                outStr: "\\pgfkeys{, , ,}",
            },
            {
                inStr: "\\pgfkeys{,%comment\n}",
                outStr: "\\pgfkeys{\n\t, %comment\n}",
            },
            {
                inStr: "\\pgfkeys{/item/.code={foo bar}}",
                outStr: "\\pgfkeys{\n\t/item/.code={foo bar}\n}",
            },
            {
                inStr: "\\pgfkeys{/item/.code={foo bar},other code = 24}",
                outStr: "\\pgfkeys{\n\t/item/.code={foo bar},\n\tother code=24\n}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
    it("Pgfkeys deals with excess whitespace", () => {
        const STRINGS = [
            {
                inStr: "\\pgfkeys{\n,\n}",
                outStr: "\\pgfkeys{,}",
            },
            {
                inStr: "\\pgfkeys{\n}",
                outStr: "\\pgfkeys{}",
            },
            {
                inStr: "\\pgfkeys{\n\n}",
                outStr: "\\pgfkeys{}",
            },
            {
                inStr: "\\pgfkeys{a=\n\n5}",
                outStr: "\\pgfkeys{a=5}",
            },
            {
                inStr: "\\pgfkeys{a\n\nb}",
                outStr: "\\pgfkeys{\n\ta\n\n\tb\n}",
            },
            {
                inStr: "\\pgfkeys{a,\n\nb}",
                outStr: "\\pgfkeys{a, b}",
            },
            {
                inStr: "\\pgfkeys{a,\n\n%comment\nb}",
                outStr: "\\pgfkeys{\n\ta,\n\n\t%comment\n\tb\n}",
            },
            {
                inStr: "\\pgfkeys{a\n\nb}",
                outStr: "\\pgfkeys{\n\ta\n\n\tb\n}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
    it("Pgfkeys properly deals with trailing/non-trailing commas", () => {
        const STRINGS = [
            {
                inStr: "\\pgfkeys{a,%comment\n}",
                outStr: "\\pgfkeys{\n\ta, %comment\n}",
            },
            {
                inStr: "\\pgfkeys{a%comment\n}",
                outStr: "\\pgfkeys{\n\ta %comment\n}",
            },
            {
                inStr: "\\pgfkeys{a%comment\n,}",
                outStr: "\\pgfkeys{\n\ta %comment\n\t,\n}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
    it("Pgfkeys can allow for parenthesis groups that contain commas", () => {
        const STRINGS = [
            {
                inStr: "(1,2),(3,4)",
                outStr: "(1,2), (3,4)",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            const ast = strToNodes(inStr);
            const parsedNoParen = parsePgfkeys(ast);
            const parsedYesParen = parsePgfkeys(ast, {
                allowParenGroups: true,
            });
            // Bare-bones printing of the parsed arguments
            const noParen = parsedNoParen.map((x) => {
                if (!x.itemParts) {
                    return "";
                }
                return x.itemParts
                    .map((y) => y.map((z) => printRaw(z)).join(""))
                    .join("");
            });
            const yesParen = parsedYesParen.map((x) => {
                if (!x.itemParts) {
                    return "";
                }
                return x.itemParts
                    .map((y) => y.map((z) => printRaw(z)).join(""))
                    .join("");
            });
            expect(noParen).toEqual(["(1", "2)", "(3", "4)"]);
            expect(yesParen).toEqual(["(1,2)", "(3,4)"]);
        }
    });
});
