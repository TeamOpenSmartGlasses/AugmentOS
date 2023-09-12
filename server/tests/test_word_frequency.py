import word_frequency

should_be_defined = ["esoteric", "facsimile",
                     "agonist", "anachronism", "sanctimony", "xenobot"]
not_be_defined = ["contextual", "orderly",
                  "unconventional", "laundry", "habitual", "ceremony"]


print("SHOULD DEFINE:")
word_frequency.find_low_freq_words(should_be_defined)
print("\nDON'T DEFINE:")
word_frequency.find_low_freq_words(not_be_defined)
