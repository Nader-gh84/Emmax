/**
 * Double Metaphone primary + secondary codes.
 * Compact port of Lawrence Philips' algorithm for voice name matching.
 */
export function doubleMetaphone(input: string): [string, string] {
  const word = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  if (!word) return ["", ""];

  const primary: string[] = [];
  const secondary: string[] = [];
  let current = 0;
  const length = word.length;
  const last = length - 1;

  const charAt = (i: number) => (i >= 0 && i < length ? word[i]! : "");
  const stringAt = (start: number, len: number, list: string[]) => {
    const slice = word.slice(start, start + len);
    return list.includes(slice);
  };
  const isVowel = (i: number) => "AEIOUY".includes(charAt(i));

  const add = (p: string, s?: string) => {
    if (p) primary.push(p);
    if (s !== undefined) {
      if (s) secondary.push(s);
    } else if (p) {
      secondary.push(p);
    }
  };

  // Skip initial silent letters
  if (stringAt(0, 2, ["GN", "KN", "PN", "WR", "PS"])) current = 1;

  if (charAt(0) === "X") {
    add("S");
    current = 1;
  }

  while (primary.join("").length < 4 || secondary.join("").length < 4) {
    if (current > last) break;
    const c = charAt(current);

    switch (c) {
      case "A":
      case "E":
      case "I":
      case "O":
      case "U":
      case "Y":
        if (current === 0) add("A");
        current += 1;
        break;

      case "B":
        add("P");
        current += charAt(current + 1) === "B" ? 2 : 1;
        break;

      case "Ç":
        add("S");
        current += 1;
        break;

      case "C":
        if (
          current > 1 &&
          !isVowel(current - 2) &&
          charAt(current + 1) === "H" &&
          charAt(current + 2) !== "I" &&
          (charAt(current + 2) !== "E" ||
            stringAt(current - 2, 6, ["BACHER", "MACHER"]))
        ) {
          add("K");
          current += 2;
          break;
        }
        if (current === 0 && stringAt(current, 6, ["CAESAR"])) {
          add("S");
          current += 2;
          break;
        }
        if (stringAt(current, 2, ["CH"])) {
          if (current > 0 && stringAt(current, 4, ["CHAE"])) {
            add("K", "X");
            current += 2;
            break;
          }
          if (
            current === 0 &&
            (stringAt(current + 1, 5, ["HARAC", "HARIS"]) ||
              stringAt(current + 1, 3, ["HOR", "HYM", "HIA", "HEM"])) &&
            !stringAt(0, 5, ["CHORE"])
          ) {
            add("K");
            current += 2;
            break;
          }
          if (
            stringAt(0, 4, ["VAN ", "VON "]) ||
            stringAt(0, 3, ["SCH"]) ||
            stringAt(current - 2, 6, ["ORCHES", "ARCHIT", "ORCHID"]) ||
            "TS".includes(charAt(current + 2)) ||
            ((current === 0 || "AOUE".includes(charAt(current - 1))) &&
              "LNESTRM".includes(charAt(current + 2)))
          ) {
            add("K");
          } else if (current > 0) {
            add(stringAt(0, 2, ["MC"]) ? "K" : "X", "K");
          } else {
            add("X");
          }
          current += 2;
          break;
        }
        if (stringAt(current, 2, ["CZ"]) && !stringAt(current - 2, 4, ["WICZ"])) {
          add("S", "X");
          current += 2;
          break;
        }
        if (stringAt(current + 1, 3, ["CIA"])) {
          add("X");
          current += 3;
          break;
        }
        if (stringAt(current, 2, ["CC"]) && !(current === 1 && charAt(0) === "M")) {
          if ("IEH".includes(charAt(current + 2))) {
            if (stringAt(current + 2, 2, ["HU"])) {
              add("K");
            } else if (
              (current === 1 && charAt(current - 1) === "A") ||
              stringAt(current - 1, 5, ["UCCEE", "UCCES"])
            ) {
              add("KS");
            } else {
              add("X");
            }
            current += 3;
            break;
          }
          add("K");
          current += 2;
          break;
        }
        if (stringAt(current, 2, ["CK", "CG", "CQ"])) {
          add("K");
          current += 2;
          break;
        }
        if (stringAt(current, 2, ["CI", "CE", "CY"])) {
          if (stringAt(current, 3, ["CIO", "CIE", "CIA"])) add("S", "X");
          else add("S");
          current += 2;
          break;
        }
        add("K");
        if (stringAt(current + 1, 2, [" C", " Q", " G"])) current += 3;
        else if (
          "CKQ".includes(charAt(current + 1)) &&
          !stringAt(current + 1, 2, ["CE", "CI"])
        ) {
          current += 2;
        } else {
          current += 1;
        }
        break;

      case "D":
        if (stringAt(current, 2, ["DG"])) {
          if ("IEY".includes(charAt(current + 2))) {
            add("J");
            current += 3;
          } else {
            add("TK");
            current += 2;
          }
          break;
        }
        if (stringAt(current, 2, ["DT", "DD"])) {
          add("T");
          current += 2;
          break;
        }
        add("T");
        current += 1;
        break;

      case "F":
        add("F");
        current += charAt(current + 1) === "F" ? 2 : 1;
        break;

      case "G":
        if (charAt(current + 1) === "H") {
          if (current > 0 && !isVowel(current - 1)) {
            add("K");
            current += 2;
            break;
          }
          if (current === 0) {
            add("AEIOU".includes(charAt(current + 2)) ? "J" : "K");
            current += 2;
            break;
          }
          if (
            (current > 1 && "BHD".includes(charAt(current - 2))) ||
            (current > 2 && "BHD".includes(charAt(current - 3))) ||
            (current > 3 && "BHD".includes(charAt(current - 4)))
          ) {
            current += 2;
            break;
          }
          if (
            current > 2 &&
            charAt(current - 1) === "U" &&
            "CGLRT".includes(charAt(current - 3))
          ) {
            add("F");
          } else if (current > 0 && charAt(current - 1) !== "I") {
            add("K");
          }
          current += 2;
          break;
        }
        if (charAt(current + 1) === "N") {
          if (current === 1 && isVowel(0) && !slavoGermanic(word)) {
            add("KN", "N");
          } else if (
            !stringAt(current + 2, 2, ["EY"]) &&
            charAt(current + 1) !== "Y" &&
            !slavoGermanic(word)
          ) {
            add("N", "KN");
          } else {
            add("KN");
          }
          current += 2;
          break;
        }
        if (stringAt(current + 1, 2, ["LI"]) && !slavoGermanic(word)) {
          add("KL", "L");
          current += 2;
          break;
        }
        if (
          current === 0 &&
          (charAt(current + 1) === "Y" ||
            stringAt(current + 1, 2, ["ES", "EP", "EB", "EL", "EY", "IB", "IL", "IN", "IE", "EI", "ER"]))
        ) {
          add("K", "J");
          current += 2;
          break;
        }
        if (
          (stringAt(current + 1, 2, ["ER"]) || charAt(current + 1) === "Y") &&
          !stringAt(0, 6, ["DANGER", "RANGER", "MANGER"]) &&
          !stringAt(current - 1, 1, ["E", "I"]) &&
          !stringAt(current - 1, 3, ["RGY", "OGY"])
        ) {
          add("K", "J");
          current += 2;
          break;
        }
        if (
          "EIY".includes(charAt(current + 1)) ||
          stringAt(current - 1, 4, ["AGGI", "OGGI"])
        ) {
          if (
            stringAt(0, 4, ["VAN ", "VON "]) ||
            stringAt(0, 3, ["SCH"]) ||
            stringAt(current + 1, 2, ["ET"])
          ) {
            add("K");
          } else if (stringAt(current + 1, 4, ["IER "])) {
            add("J");
          } else {
            add("J", "K");
          }
          current += 2;
          break;
        }
        add("K");
        current += charAt(current + 1) === "G" ? 2 : 1;
        break;

      case "H":
        if (
          (current === 0 || isVowel(current - 1)) &&
          isVowel(current + 1)
        ) {
          add("H");
          current += 2;
        } else {
          current += 1;
        }
        break;

      case "J":
        if (stringAt(current, 4, ["JOSE"]) || stringAt(0, 4, ["SAN "])) {
          if (
            (current === 0 && charAt(current + 4) === " ") ||
            stringAt(0, 4, ["SAN "])
          ) {
            add("H");
          } else {
            add("J", "H");
          }
          current += 1;
          break;
        }
        if (current === 0 && !stringAt(current, 4, ["JOSE"])) {
          add("J", "A");
        } else if (
          isVowel(current - 1) &&
          !slavoGermanic(word) &&
          (charAt(current + 1) === "A" || charAt(current + 1) === "O")
        ) {
          add("J", "H");
        } else if (current === last) {
          add("J", "");
        } else if (
          !"LTKSNMBZ".includes(charAt(current + 1)) &&
          !"SKL".includes(charAt(current - 1))
        ) {
          add("J");
        }
        current += charAt(current + 1) === "J" ? 2 : 1;
        break;

      case "K":
        add("K");
        current += charAt(current + 1) === "K" ? 2 : 1;
        break;

      case "L":
        if (charAt(current + 1) === "L") {
          if (
            (current === length - 3 &&
              stringAt(current - 1, 4, ["ILLO", "ILLA", "ALLE"])) ||
            ((stringAt(last - 1, 2, ["AS", "OS"]) ||
              charAt(last) === "A" ||
              charAt(last) === "O") &&
              stringAt(current - 1, 4, ["ALLE"]))
          ) {
            add("L", "");
            current += 2;
            break;
          }
          add("L");
          current += 2;
        } else {
          add("L");
          current += 1;
        }
        break;

      case "M":
        if (
          stringAt(current - 1, 3, ["UMB"]) &&
          (current + 1 === last || stringAt(current + 2, 2, ["ER"]))
        ) {
          add("M");
          current += 2;
          break;
        }
        add("M");
        current += charAt(current + 1) === "M" ? 2 : 1;
        break;

      case "N":
        add("N");
        current += charAt(current + 1) === "N" ? 2 : 1;
        break;

      case "Ñ":
        add("N");
        current += 1;
        break;

      case "P":
        if (charAt(current + 1) === "H") {
          add("F");
          current += 2;
          break;
        }
        add("P");
        current += "PB".includes(charAt(current + 1)) ? 2 : 1;
        break;

      case "Q":
        add("K");
        current += charAt(current + 1) === "Q" ? 2 : 1;
        break;

      case "R":
        if (
          current === last &&
          !slavoGermanic(word) &&
          stringAt(current - 2, 2, ["IE"]) &&
          !stringAt(current - 4, 2, ["ME", "MA"])
        ) {
          add("", "R");
        } else {
          add("R");
        }
        current += charAt(current + 1) === "R" ? 2 : 1;
        break;

      case "S":
        if (stringAt(current - 1, 3, ["ISL", "YSL"])) {
          current += 1;
          break;
        }
        if (current === 0 && stringAt(current, 5, ["SUGAR"])) {
          add("X", "S");
          current += 1;
          break;
        }
        if (stringAt(current, 2, ["SH"])) {
          add(
            stringAt(current + 1, 4, ["HEIM", "HOEK", "HOLM", "HOLZ"]) ? "S" : "X"
          );
          current += 2;
          break;
        }
        if (stringAt(current, 3, ["SIO", "SIA"]) || stringAt(current, 4, ["SIAN"])) {
          add("S", slavoGermanic(word) ? "S" : "X");
          current += 3;
          break;
        }
        if (
          (current === 0 && "MNLW".includes(charAt(current + 1))) ||
          charAt(current + 1) === "Z"
        ) {
          add("S", "X");
          current += charAt(current + 1) === "Z" ? 2 : 1;
          break;
        }
        if (stringAt(current, 2, ["SC"])) {
          if (charAt(current + 2) === "H") {
            if (stringAt(current + 3, 2, ["OO", "ER", "EN", "UY", "ED", "EM"])) {
              add(
                stringAt(current + 3, 2, ["ER", "EN"]) ? "X" : "SK",
                stringAt(current + 3, 2, ["ER", "EN"]) ? "SK" : "SK"
              );
              if (stringAt(current + 3, 2, ["ER", "EN"])) {
                // already handled loosely
              }
              current += 3;
              break;
            }
            if (
              current === 0 &&
              !isVowel(3) &&
              charAt(3) !== "W"
            ) {
              add("X", "S");
            } else {
              add("X");
            }
            current += 3;
            break;
          }
          if ("IEY".includes(charAt(current + 2))) {
            add("S");
            current += 3;
            break;
          }
          add("SK");
          current += 3;
          break;
        }
        if (current === last && stringAt(current - 2, 2, ["AI", "OI"])) {
          add("", "S");
        } else {
          add("S");
        }
        current += "SZ".includes(charAt(current + 1)) ? 2 : 1;
        break;

      case "T":
        if (stringAt(current, 4, ["TION"])) {
          add("X");
          current += 3;
          break;
        }
        if (stringAt(current, 3, ["TIA", "TCH"])) {
          add("X");
          current += 3;
          break;
        }
        if (stringAt(current, 2, ["TH"]) || stringAt(current, 3, ["TTH"])) {
          if (
            stringAt(current + 2, 2, ["OM", "AM"]) ||
            stringAt(0, 4, ["VAN ", "VON "]) ||
            stringAt(0, 3, ["SCH"])
          ) {
            add("T");
          } else {
            add("0", "T");
          }
          current += 2;
          break;
        }
        add("T");
        current += "TD".includes(charAt(current + 1)) ? 2 : 1;
        break;

      case "V":
        add("F");
        current += charAt(current + 1) === "V" ? 2 : 1;
        break;

      case "W":
        if (stringAt(current, 2, ["WR"])) {
          add("R");
          current += 2;
          break;
        }
        if (current === 0 && (isVowel(1) || stringAt(current, 2, ["WH"]))) {
          add(isVowel(1) ? "A" : "A", isVowel(1) ? "F" : undefined);
        }
        if (
          (current === last && isVowel(current - 1)) ||
          stringAt(current - 1, 5, ["EWSKI", "EWSKY", "OWSKI", "OWSKY"]) ||
          stringAt(0, 3, ["SCH"])
        ) {
          add("", "F");
          current += 1;
          break;
        }
        if (stringAt(current, 4, ["WICZ", "WITZ"])) {
          add("TS", "FX");
          current += 4;
          break;
        }
        current += 1;
        break;

      case "X":
        if (
          !(
            current === last &&
            (stringAt(current - 3, 3, ["IAU", "EAU"]) ||
              stringAt(current - 2, 2, ["AU", "OU"]))
          )
        ) {
          add("KS");
        }
        current += "CX".includes(charAt(current + 1)) ? 2 : 1;
        break;

      case "Z":
        if (charAt(current + 1) === "H") {
          add("J");
          current += 2;
          break;
        }
        if (
          stringAt(current + 1, 2, ["ZO", "ZI", "ZA"]) ||
          (slavoGermanic(word) && current > 0 && charAt(current - 1) !== "T")
        ) {
          add("S", "TS");
        } else {
          add("S");
        }
        current += charAt(current + 1) === "Z" ? 2 : 1;
        break;

      default:
        current += 1;
    }
  }

  return [primary.join("").slice(0, 4), secondary.join("").slice(0, 4)];
}

function slavoGermanic(word: string): boolean {
  return /W|K|CZ|WITZ/.test(word);
}

/** True when primary or secondary metaphone codes overlap. */
export function phoneticCodesMatch(a: string, b: string): boolean {
  const [ap, as] = doubleMetaphone(a);
  const [bp, bs] = doubleMetaphone(b);
  if (!ap && !bp) return false;
  return (
    (ap !== "" && (ap === bp || ap === bs)) ||
    (as !== "" && (as === bp || as === bs))
  );
}
