import fs from 'fs'

export const {stat, chmod, readFile, writeFile, cp, mkdir, readdir} =
  fs.promises
