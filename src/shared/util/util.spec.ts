import { Util } from "./util";

describe("Util tests", () => {
    describe("General utility functions", () => {
        test("interpolate", () => {
            const test = Util.interpolate("{test}", {test: "123", invalid: "invalid!"});
            expect(test).toBe("123");
        });

        test("batch", () => {
            const batches = Util.batch([1, 2, 3, 4, 5, 6], 2);

            expect(batches.length).toBe(3);
            expect(batches[0]).toEqual([1, 2]);
            expect(batches[1]).toEqual([3, 4]);
            expect(batches[2]).toEqual([5, 6]);
        });

        test("assignIfDefined", () => {
            const target = {test: "hi!"}
            
            Util.assignIfDefined(target, {tested: "bye!", ignoreThis: undefined});

            expect(target).toEqual({test: "hi!", tested: "bye!"});
            expect("ignoreThis" in target).toBe(false);
        });


        test("merge", () => {
            const from = {
                test: "hi!",
                fromFrom: "from!",
                shouldBe1: 1,
                array: [1, 2, 3],
                heh: ["overwritten"],
            }

            const into = {
                test: "bye!",
                tested: ":)",
                shouldBe1: 2,
                array: [4, 5],
                heh: 1,
            }

            const merged = Util.merge(from, into);

            expect(merged).toEqual({
                test: "hi!",
                fromFrom: "from!",
                tested: ":)", 
                shouldBe1: 1,
                array: [1, 2, 3, 4, 5],
                heh: ["overwritten"],
            });

        });
    });
    
});