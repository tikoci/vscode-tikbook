/* eslint-env node */
/* global console, process */

import { $ } from 'bun'
import * as Bun from 'bun'

// Define the seconds_to_vtt function to convert seconds into WebVTT timestamp format (HH:MM:SS.mmm)
function secondsToVtt(seconds) {
  // Calculate hours, minutes, and seconds
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  // Format the components with leading zeros and milliseconds
  // padStart(2, '0') ensures two digits (e.g., 5 -> "05")
  // toFixed(3) formats seconds to three decimal places
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`
}

// Define the main asynchronous function to extract chapters and generate the VTT file
async function extractChaptersToVtt(infile, outfile) {
  try {
    // Construct the ffprobe command using Bun's $() shell operator.
    // The $() operator allows running shell commands directly and capturing their output.
    // It returns a Response object, from which we can get stdout/stderr as text.
    const ffprobeCommand = $`ffprobe -v quiet -print_format json -show_chapters ${infile}`

    // Execute the command and await its completion.
    // .text() method on the Response object gets the stdout as a string.
    const result = await ffprobeCommand.text()

    // Parse the JSON output from ffprobe
    const data = JSON.parse(result)

    // Initialize the WebVTT content with the required header
    let vttContent = 'WEBVTT\n\n'

    console.log(data.chapters)
    // Iterate over each chapter found in the ffprobe output
    // The 'chapters' array contains objects with 'start_time', 'end_time', and 'tags' (which might contain 'title').
    for (let i = 0; i < data.chapters.length; i++) {
      const chapter = data.chapters[i]
      const startTime = parseFloat(chapter.start_time)
      const endTime = parseFloat(chapter.end_time)

      // Get the chapter title from tags, or default to "Chapter X" if not found
      const title = chapter.tags?.title || `Chapter ${i + 1}`

      // Convert start and end times to WebVTT format
      const startVtt = secondsToVtt(startTime)
      const endVtt = secondsToVtt(endTime)

      // Append the chapter entry to the WebVTT content string
      vttContent += `${startVtt} --> ${endVtt}\n`
      vttContent += `${title}\n\n`
    }

    // Write the complete WebVTT content to the specified output file using Bun.write().
    // Bun.write() is an efficient way to write content to a file.
    console.log(vttContent)
    // const bunOutputFile = Bun.file(outputFile)
    console.log(outfile)
    await Bun.write(outfile, vttContent)

    console.log(`Successfully generated WebVTT for chapters to: ${outfile}`)
  }
  catch (error) {
    // Catch and log any errors that occur during the process
    console.error(`Error generating WebVTT: ${error.message}`)
    // If the error is from ffprobe (e.g., file not found, no chapters), provide more context.
    if (error.exitCode !== undefined) {
      console.error(`ffprobe exited with code ${error.exitCode}. Stderr: ${error.stderr}`)
    }
    process.exit(1) // Exit with a non-zero code to indicate an error
  }
}

// Main execution block:
// Check if the correct number of command-line arguments are provided.
// process.argv[0] is 'bun', process.argv[1] is the script file path.
// So, arguments start from index 2.
if (process.argv.length < 4) {
  console.error('Usage: bun run <script_name>.js <input_file> <output_file.vtt>')
  process.exit(1) // Exit with an error code
}

// Get input and output file paths from command-line arguments
const inputFile = process.argv[2]
const outputFile = process.argv[3]
console.log (outputFile)

// Call the main function with the provided arguments
extractChaptersToVtt(inputFile, outputFile)
