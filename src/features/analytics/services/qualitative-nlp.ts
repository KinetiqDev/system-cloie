import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { eng } from "stopword";

/**
 * One shared winkNLP instance for every qualitative derivation (token counts
 * and deterministic tone scoring). Loading the model is the expensive part, so
 * it happens once per process rather than once per service module.
 */
export const qualitativeNlp = winkNLP(model);

/** English stopwords removed from every qualitative token projection. */
export const qualitativeStopWords: ReadonlySet<string> = new Set(eng);
