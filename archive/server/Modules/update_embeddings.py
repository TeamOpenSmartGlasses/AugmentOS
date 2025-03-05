import os
import sys
from txtai.embeddings import Embeddings
from txtai.pipeline import Similarity
from Modules.Summarizer import Summarizer
from constants import SUMMARIZE_CUSTOM_DATA
import pandas as pd
import json

summarizer = Summarizer(None)

# utils
def estimate_df_line_number(df_path):
    full_size = os.path.getsize(df_path)  # get size of file
    linecount = None
    with open(df_path, 'rb') as f:
        next(f)                              # skip header
        f.readline()  # skip header of csv, as it's always different
        # get average size of 3 lines, assuming 1 byte encoding
        line_size = (len(f.readline()) + len(f.readline()) +
                     len(f.readline())) / 3
        linecount = full_size // line_size + 1   # ~count of lines
    return linecount


def stream(dataset):
    global stream_index
    for idx, row in dataset.iterrows():
        title = str(row['title'])

        try:
            description = summarizer.summarize_description_with_bert(str(row['description'])) if SUMMARIZE_CUSTOM_DATA else str(
                row['description'])
        except:
            #print("Error summarizing entity: {}".format(row['title']))
            description = str(row['description'])

        #print("Title: {}".format(title))
        #print("-- Description: {}".format(description))

        tags = json.dumps({"title" : title,
                "description" : description,
                "url" : str(row["url"])
                })

        text = title + ": " + description
        yield title, text, tags


def semantic_search(embeddings, query):
    return [(result["score"], result["text"], result["tags"]) for result in embeddings.search(f"select id, text, score, tags from txtai where similar('{query}')", limit=10)]


def ranksearch(query):
    results = [text for _, text in search(query)]
    return [(score, results[x]) for x, score in similarity(query, results)]


# def convert_id(row):
#     global mapper
#     page_title = row["page_title"]
#     wikidata_id = mapper.title_to_id(str(page_title).replace(" ", "_"))
#     return wikidata_id


def process(df, embeddings):
    # df['timestamp'] = pd.to_datetime(df['timestamp'],format='%Y-%m-%dT%H:%M:%SZ')

    # print("\n\n")
    # print("BEFORE")
    # print(df)

    # add a column which is the wikidata id
    # print("Generating wikidata id column")
    # df['wikidata_id'] = df.apply(lambda row: convert_id(row), axis=1)

    # filter the chunk down to just pages which are included in the top n qrank
    # df = df[df["wikidata_id"].isin(qrank["Entity"])]
    # print("AFTER")
    # print(df)
    # print("\n\n")

    # dataset = df['abstract'].tolist()

    # Create embeddings model, backed by sentence-transformers & transformers,
    # enable content storage
    print("Starting making embeddings...")
    embeddings.upsert(stream(df))
    # insert into csv
    # add_csv(dataset)
    # top_wiki_name += dataset
    # print("Done making embeddings.")

    return embeddings

    # Create similarity instance for re-ranking
    # similarity = Similarity("valhalla/distilbart-mnli-12-3")

    # queries = ["what a wonderful world", "Donald Trump", "big war in the 60s",
    # "hippy music festival 1969", "opposite of day", "dog"] for query in queries:
    # print("Running similiarity search.") print(ranksearch(query)[:2])


# mapper = WikiMapper("index_enwiki_latest_ossg.db")


# Load HF dataset
# dataset = load_dataset("ag_news", split="train")

def update_embeddings(df, user_id):
    # print("Loading CSV...")
    # df = pd.read_csv('enwiki-20220901-pages-articles-multistream.csv', quotechar='|', index_col = False, nrows=NUMERO)
    user_folder_path = os.path.join('custom_data', str(user_id))
    # load the qrank top n csv to compare
    # qrank = pd.read_csv("qrank_top_n_pandas_hundredthousand_2.csv")
    # qrank = pd.read_csv("qrank_top_n_pandas_tenthousand_2.csv")

    embeddings = Embeddings(
        {"path": "sentence-transformers/paraphrase-MiniLM-L3-v2", "content": True})
    # top_wiki_name = []

    # chunk through the CSV so we don't load ~86Gb at once
    # chunksize = 10 ** 4
    # curr_line_idx = 0
    # total_lines_to_proc = estimate_df_line_number(csv_path)
    # i = 0

    populated_embeddings = process(df, embeddings)

    # for chunk in pd.read_csv(csv_path, quotechar='|', index_col = False, chunksize=chunksize):
    # for chunk in pd.read_csv(csv_path, chunksize=chunksize):
    #     curr_line_idx += len(chunk.index)
    #     curr_percent_embedded = (curr_line_idx / total_lines_to_proc) * 100
    #     print("Embedding progress: {}% complete".format(curr_percent_embedded))
    #     print("Loaded CSV chunk.")
    #     proc_finished_flag = process(chunk)
    #     print("Processed CSV chunk.")
    #     i += 1

    #     if proc_finished_flag:
    #         break

    populated_embeddings.save(
        f"{user_folder_path}/custom_data_embeddings.txtai"
    )

    return populated_embeddings

    # top_df = pd.DataFrame({'title':top_wiki_name})
    # top_df.to_csv("test.csv")


if __name__ == "__main__":
    os.makedirs(os.path.join('custom_data', str(
        sys.argv[1])), exist_ok=True)
    embeddings = update_embeddings(pd.read_csv(sys.argv[2]), sys.argv[1])
    search_results = semantic_search(embeddings, "wearable augmentation and memory")
    print(search_results)
