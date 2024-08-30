import { Options } from './interfaces/options';
import { Bookmark } from './interfaces/bookmark';

const parsers = {
  netscape: require('./parsers/netscape'),
  // Add more parsers here, e.g., 'firefox': require('./parsers/firefox')
};

const DEFAULT_OPTIONS: Options = { parser: 'netscape' };

export = (
  code: string,
  options: Options = DEFAULT_OPTIONS,
  onSuccess?: (bookmarks: Bookmark[]) => void,
  onFailure?: (error: Error) => void
): Bookmark[] => {
  // Input validation
  if (typeof code !== 'string' || code.trim() === '') {
    const error = new Error('Invalid input: code must be a non-empty string.');
    if (onFailure) onFailure(error);
    throw error;
  }

  const parser = parsers[options.parser];

  // Check for parser existence
  if (!parser) {
    const error = new Error(`Parser "${options.parser}" does not exist.`);
    if (onFailure) onFailure(error);
    throw error;
  }

  // Check if parser can handle the provided code
  if (!parser.canParse(code)) {
    const error = new Error(
      `Parser "${options.parser}" could not parse the provided HTML code.`
    );
    if (onFailure) onFailure(error);
    throw error;
  }

  try {
    // Parse the code
    const bookmarks = parser.parse(code);
    
    // Logging the parsing process
    console.log(`Parsing succeeded using "${options.parser}" parser.`);

    // Success callback
    if (onSuccess) onSuccess(bookmarks);

    return bookmarks;
  } catch (err) {
    const error = new Error(
      `An error occurred while parsing with "${options.parser}": ${err.message}`
    );
    if (onFailure) onFailure(error);
    console.error(error.message);
    throw error;
  }
};
