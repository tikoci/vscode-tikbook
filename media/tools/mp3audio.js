/* eslint-env node */
/* global console, process, setInterval, clearInterval */

import { readdir } from 'node:fs/promises'
import { join, parse, resolve } from 'node:path'
import { $ } from 'bun' // Import the Bun Shell
import * as Bun from 'bun'

const inputPath = process.argv[2] || '.' // Use current directory if not specified
const outputSuffix = 'mp3audio'
const maxConcurrentProcesses = 16 // Adjust as needed based on your CPU/disk I/O

let activeProcesses = 0
const processQueue = []
let totalFilesProcessed = 0
let totalFilesSkipped = 0
let totalFilesConverted = 0
let totalFilesErrored = 0

/**
 * Executes a function and adds its promise to a queue, managing concurrency.
 * @param {Function} taskFunction - The function to execute, which should return a Promise.
 */
async function runWithConcurrencyControl(taskFunction) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const task = async () => {
      activeProcesses++
      try {
        await taskFunction()
        resolve()
      }
      catch (error) {
        reject(error)
      }
      finally {
        activeProcesses--
        processNextTask()
      }
    }

    if (activeProcesses < maxConcurrentProcesses) {
      task()
    }
    else {
      processQueue.push(task)
    }
  })
}

/**
 * Attempts to run the next task in the queue if concurrency allows.
 */
function processNextTask() {
  if (activeProcesses < maxConcurrentProcesses && processQueue.length > 0) {
    const nextTask = processQueue.shift()
    nextTask()
  }
}

/**
 * Processes a single MP4 file using ffmpeg via Bun Shell.
 * @param {string} fullPath - The full path to the input MP4 file.
 * @param {string} relativePath - The path relative to the initial input directory (for logging).
 */
async function processMp4File(fullPath, relativePath) {
  totalFilesProcessed++
  const parsedPath = parse(fullPath)
  const newFileName = `${parsedPath.name}.${outputSuffix}.mp4`
  const newFilePath = join(parsedPath.dir, newFileName)

  console.log(`\nProcessing: "${relativePath}"`)
  console.log(`Output to:  "${newFilePath}"`)

  // Check if the output file already exists
  try {
    const fileStat = await Bun.file(newFilePath).exists()
    if (fileStat) {
      console.log(`Skipping: "${newFilePath}" already exists.`)
      totalFilesSkipped++
      return
    }
  }
  catch (e) {
    console.warn(`Warning checking existence for "${newFilePath}": ${e.message}`)
  }

  try {
    // Corrected: Removed .stdio("inherit") as it's not a function on the command itself,
    // and Bun Shell often inherits stdio by default for direct command execution.
    // If you need explicit streaming, you'd chain it with something like .stdout.pipeTo(Bun.stdout).
    await $`ffmpeg -y -analyzeduration 100M -probesize 100M -i  ${fullPath} -c:v copy -c:a libmp3lame -q:a 0 -movflags faststart ${newFilePath}`

    console.log(`Successfully converted "${relativePath}" to "${newFilePath}"`)
    totalFilesConverted++
  }
  catch (error) {
    console.error(`Error during ffmpeg process for "${relativePath}":`, error)
    totalFilesErrored++
  }
}

/**
 * Recursively traverses directories and processes MP4 files.
 * @param {string} currentDir - The current directory being traversed.
 * @param {string} baseDir - The initial directory from which recursion started (for relative paths).
 */
async function traverseDirectory(currentDir, baseDir) {
  try {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)
      // For the base directory, relativePath should be empty or '.'
      const relativePath = baseDir === currentDir ? entry.name : join(currentDir.substring(baseDir.length + 1), entry.name)

      if (entry.isDirectory()) {
        console.log(`\nEntering directory: "${relativePath || '.'}"`)
        await traverseDirectory(fullPath, baseDir) // Recurse into subdirectory
      }
      else if (entry.isFile() && entry.name.endsWith('.mp4')) {
        await runWithConcurrencyControl(() => processMp4File(fullPath, relativePath))
      }
    }
  }
  catch (err) {
    console.error(`Error processing directory "${currentDir}": ${err.message}`)
  }
}

async function main() {
  // Resolve the input path to an absolute path for consistent relative path calculations
  const absoluteInputPath = resolve(inputPath)
  console.log(`Starting MP4 to MP3 audio conversion from: "${absoluteInputPath}"`)
  console.log(`Max concurrent FFmpeg processes: ${maxConcurrentProcesses}`)

  await traverseDirectory(absoluteInputPath, absoluteInputPath)

  // Wait for all queued processes to finish
  if (processQueue.length > 0 || activeProcesses > 0) {
    console.log(`\nWaiting for remaining tasks to complete...`)
    await new Promise((resolve) => {
      const checkQueue = setInterval(() => {
        if (activeProcesses === 0 && processQueue.length === 0) {
          clearInterval(checkQueue)
          resolve()
        }
      }, 200) // Check every 200ms
    })
  }

  console.log('\n--- Conversion Summary ---')
  console.log(`Total files scanned (MP4s): ${totalFilesProcessed + totalFilesSkipped}`)
  console.log(`Files attempted conversion: ${totalFilesProcessed}`)
  console.log(`Files successfully converted: ${totalFilesConverted}`)
  console.log(`Files skipped (already existed): ${totalFilesSkipped}`)
  console.log(`Files with errors: ${totalFilesErrored}`)
  console.log('--------------------------')
  console.log('\nAll MP4 to MP3 audio conversions complete.')
}

main()
