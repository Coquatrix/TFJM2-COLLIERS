document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const inputL = document.getElementById('length-l');
    const inputP = document.getElementById('price-p');
    const inputM = document.getElementById('max-zeros-m');

    const listBinary = document.getElementById('list-binary');
    const listGeneral = document.getElementById('list-general');
    const countBinary = document.getElementById('count-binary');
    const countGeneral = document.getElementById('count-general');

    generateBtn.addEventListener('click', () => {
        const l = parseInt(inputL.value);
        const p = parseInt(inputP.value);
        const m = parseInt(inputM.value);

        if (isNaN(l) || isNaN(p) || isNaN(m)) {
            alert("Veuillez entrer des nombres valides.");
            return;
        }

        if (l > 50) { // Safety check
            if (!confirm("Une longueur > 50 peut ralentir le navigateur. Continuer ?")) return;
        }

        // Generate Binary Necklaces (vals 0, 1)
        // Binary constraint: pearls MUST be 0 or 1.
        // Thus sum(pearls) == number of 1s in the necklace.
        // So we need exactly 'p' ones and 'l-p' zeros.
        // If p > l, impossible to have pearls only 0/1 summing to p.
        let binaryNecklaces = [];
        if (p <= l) {
            binaryNecklaces = solveBinary(l, p, m);
        }

        // Generate General Necklaces (vals 0...p)
        const generalNecklaces = solveGeneral(l, p, m);

        renderResults(listBinary, countBinary, binaryNecklaces);
        renderResults(listGeneral, countGeneral, generalNecklaces);
    });

    function solveBinary(l, p, m) {
        // We need to place 'p' ones into 'l' slots.
        // Approach: standard recursion to generate specific permutations, then filter.
        // Optimization: since we just need permutations of {1 repeated p times, 0 repeated l-p times},
        // we can just generate all binary strings of length l, filter by sum=p. 
        // Or better: recursion with countdown of ones remaining.

        let results = new Set();
        let validNecklaces = [];

        function backtrack(current) {
            if (current.length === l) {
                // Check sum
                const sum = current.reduce((a, b) => a + b, 0);
                if (sum !== p) return;

                // Check constraints (m zeros)
                if (failsZeroConstraint(current, m)) return;

                // Canonicalize
                const canonical = getCanonical(current);
                if (!results.has(canonical.key)) {
                    results.add(canonical.key);
                    validNecklaces.push(canonical.arr);
                }
                return;
            }

            // Pruning: if remaining slots aren't enough to reach sum P
            const currentSum = current.reduce((a, b) => a + b, 0);
            const remaining = l - current.length;
            if (currentSum + remaining < p) return; // Even if all 1s, can't reach p
            if (currentSum > p) return; // Already exceeded

            // Try adding 1
            backtrack([...current, 1]);
            // Try adding 0
            backtrack([...current, 0]);
        }

        backtrack([]);

        // Sort: "Starting with pearl of highest value". 
        // getCanonical already rotates to max lexicographical.
        // We should sort the LIST of necklaces too? Doesn't specify, but good UX.
        validNecklaces.sort((a, b) => compareArrays(b, a)); // Descending
        return validNecklaces;
    }

    function solveGeneral(l, p, m) {
        // Need to find sequences length l, sum p, values >= 0.
        // Equivalent to compositions of p into l parts (weak compositions).
        let results = new Set();
        let validNecklaces = [];

        function backtrack(current) {
            if (current.length === l) {
                const sum = current.reduce((a, b) => a + b, 0);
                if (sum === p) {
                    if (failsZeroConstraint(current, m)) return;

                    const canonical = getCanonical(current);
                    if (!results.has(canonical.key)) {
                        results.add(canonical.key);
                        validNecklaces.push(canonical.arr);
                    }
                }
                return;
            }

            const currentSum = current.reduce((a, b) => a + b, 0, 0);
            // Possible values for next slot: 0 to (p - currentSum)
            // Optimization: we can stop if currentSum > p. Check is implicitly handled by loop limit.

            const remainingSum = p - currentSum;
            // Since values are non-negative, next value can't exceed remainingSum.

            for (let v = remainingSum; v >= 0; v--) { // Try high values first might find max canonical faster? irrelevant for correctness
                backtrack([...current, v]);
            }
        }

        backtrack([]);
        validNecklaces.sort((a, b) => compareArrays(b, a));
        return validNecklaces;
    }

    // Check if necklace has m consecutive zeros (circularly)
    function failsZeroConstraint(arr, m) {
        // Simple way: duplicate the array to simulate circle, check for substring of m zeros.
        // Actually only need to append first m-1 elements to end.
        const extended = arr.concat(arr.slice(0, m)); // Safety margin
        let consecutive = 0;
        for (let val of extended) {
            if (val === 0) {
                consecutive++;
                if (consecutive >= m) return true;
            } else {
                consecutive = 0;
            }
        }
        return false;
    }

    // Rotate to find lexicographically largest version
    function getCanonical(arr) {
        let maxArr = arr.slice();
        let maxKey = arr.join(',');

        const len = arr.length;
        // Make a double array to slice easily
        const double = arr.concat(arr);

        for (let i = 1; i < len; i++) {
            const candidate = double.slice(i, i + len);
            if (compareArrays(candidate, maxArr) > 0) {
                maxArr = candidate;
                maxKey = candidate.join(',');
            }
        }
        return { arr: maxArr, key: maxKey };
    }

    // Returns >0 if a > b, <0 if a < b, 0 i equal
    function compareArrays(a, b) {
        for (let i = 0; i < a.length; i++) {
            if (a[i] > b[i]) return 1;
            if (a[i] < b[i]) return -1;
        }
        return 0;
    }

    function renderResults(container, countElem, necklaces) {
        container.innerHTML = '';
        countElem.textContent = necklaces.length;

        if (necklaces.length === 0) {
            container.innerHTML = '<div class="necklace-card" style="text-align:center;color:var(--text-secondary)">Aucun résultat</div>';
            return;
        }

        necklaces.forEach(seq => {
            const card = document.createElement('div');
            card.className = 'necklace-card';

            const display = document.createElement('div');
            display.className = 'necklace-display';

            const maxVal = Math.max(...seq);

            seq.forEach(val => {
                const pearl = document.createElement('div');
                pearl.className = `pearl ${val === 0 ? 'pearl-0' : (val === maxVal && val > 0 ? 'pearl-high' : 'pearl-val')}`;
                pearl.textContent = val;
                display.appendChild(pearl);
            });

            card.appendChild(display);
            container.appendChild(card);
        });
    }
});
