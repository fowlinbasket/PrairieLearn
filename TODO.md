

[] what kind of tests should I be writing and where do I put them?

On the 'sharing' page:
- [x] let you declare your course 'slug' or 'sharing name' or whatever we want to call it.
- [x] access your code to let someone else share their questions with you
- [x] create a new 'sharing set'
- [x] share a 'sharing set' to a particular course
- [] Bulk operations for adding questions to sharing sets (probably not in the MVP)


On the settings page for each question:
- [] add the question to a sharing set


When trying to access a question:
- [] Fix the hack I put in before, make sure it works for shared and non-shared questions


Fill out the new documentation page!
- [x] what is a sharing set? and why do we want them?


Funcitonality to test!!!
- [] disallow duplicate sharing set names, with a good error message
- [] disallow adding the same course to be shared with again (probably don't need an error message?)
- [] sharing permissions deleted properly


To discuss with Matt/Nathan:
- [] What edge case behavior do we want for each operation? (when it comes to creating a
- [] should sharing set names allow spaces?
- [] do we want to have any bulk operations ready to go from the get-go?
- [] rules for sharing names? no spaces? no @ at the begining? (@@ would look weird). Maybe just say it must start with an alphabetic or alphanumeric character? upper and/or lower case? I don't know anything.


Deployment considerations
- [] Special case to silently fail question imports when running in local dev
- [] Special case to only enable the feature on the main (Illinois) server!!!