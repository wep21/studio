// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

const { Identify } = require("@amplitude/identify");
const Amplitude = require("@amplitude/node");
const { parse } = require("csv-parse");
const fs = require("fs");

const monthNames = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  10: "October",
  11: "November",
  12: "December",
};

async function main() {
  const amp = Amplitude.init("5901954258feaf8c2362f75b59d4e3cd");

  for (const year of ["2021", "2022"]) {
    for (const month of Object.keys(monthNames).sort()) {
      const fileName = __dirname + `/Cohort_New__${monthNames[month]}_${year}.csv`;
      console.log(`\n\n${fileName}`);

      if (!fs.existsSync(fileName)) {
        console.log("not exists, skipping...");
        continue;
      }

      const parser = fs.createReadStream(fileName).pipe(parse({ columns: true }));

      for await (const row of parser) {
        const amplitude_id = row["\tamplitude_id"].trim();
        const user_id = row["\tuser_id"].trim() || null;
        const device_ids = row["\tdevice_ids"].trim().split(" ");
        console.log({ amplitude_id, user_id, device_ids });

        if (device_ids.length == 0) {
          throw new Error("missing device_id");
        }

        for (const device_id of device_ids) {
          const identify = new Identify();
          identify.setOnce("first_seen_date", `${year}-${month}`);
          identify.setOnce("first_seen_month", `${year}-${month}`);
          identify.setOnce("first_seen_year", year);

          const resp = await amp.identify(user_id, device_id, identify);
          if (resp.status !== "success") {
            console.error(resp);
            return;
          }
        }
      }
    }
  }
}

main();
