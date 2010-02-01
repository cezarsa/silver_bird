require 'crxmake'

module Constants
  KEY_FILE = "../chromed_bird.pem"
  BETA_KEY_FILE = "../chromed_bird_beta.pem"
  IGNORE_DIR = /\.git/
  IGNORE_FILE = /Rakefile|\.gitignore|.*\.crx$|.*\.zip$/
end

def current_branch
  `git branch` =~ /\* (.*)$/i
  current_branch = $1
end

def get_filename(extension, ext)
  "./chromed_bird_#{extension.id}_#{extension.version}_#{current_branch}.#{ext}"
end

@crxmake_hash = {
  :ex_dir => ".",
  :pkey => Constants::KEY_FILE,
  :verbose => false,
  :ignorefile => Constants::IGNORE_FILE,
  :ignoredir => Constants::IGNORE_DIR
}

def make_crx(key_file)
  crxmake_hash = @crxmake_hash.dup
  crxmake_hash[:pkey] = key_file
  CrxMake.make(crxmake_hash) do |extension|
    get_filename(extension, 'crx')
  end
end

task :default => :'pack:default'

namespace :pack do
  desc 'pack extension using main key'
  task :default do
    make_crx(Constants::KEY_FILE)
  end

  desc 'pack extension using beta key'
  task :beta do
    make_crx(Constants::BETA_KEY_FILE)
  end

  desc 'pack extension using a generated key'
  task :random do
    make_crx(nil)
  end
end

desc 'generate zip file for extension gallery'
task :zip do
  CrxMake.zip(@crxmake_hash) do |extension|
    get_filename(extension, 'zip')
  end
end