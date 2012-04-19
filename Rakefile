require 'crxmake'
require 'fileutils'
require 'digest/sha2'
require 'json'

class CrxMake
  alias_method :orig_zip, :zip
  def zip
    orig_zip
    read_key
  end
  def public_key
    KEY + @key.public_key.to_der
  end
end

class ExtensionInfo
  attr_reader :id, :name, :version
  def initialize(public_key, path)
    @id = generate_id(public_key)
    @path = path
    load_manifest
  end

  private
  def load_manifest
    json_data = File.read(File.join(@path, 'manifest.json'))
    manifest_data = JSON.parse(json_data)
    @name = manifest_data['name']
    @version = manifest_data['version']
  end

  def generate_id(public_key)
    hex_id = Digest::SHA2.hexdigest(public_key)
    a_pos = 'a'.getbyte(0)
    hex_id[0...32].split('').map do |char|
      (char.hex + a_pos).chr
    end.join
  end
end

module Constants
  KEY_FILE = "../silver_bird.pem"
  BETA_KEY_FILE = "../silver_bird_beta.pem"
  IGNORE_DIR = /\.git/
  IGNORE_FILE = /Rakefile|\.gitignore|.*\.crx$|.*\.zip$/
  TEMP_PACKAGE_FILE = "/tmp/tmp_package"
end

def current_branch
  `git branch` =~ /\* (.*)$/i
  current_branch = $1
end

def get_filename(extension_info, ext)
  "./chromed_bird_#{extension_info.id}_#{extension_info.version}_#{current_branch}.#{ext}"
end

@crxmake_hash = {
  :ex_dir => ".",
  :crx_output => Constants::TEMP_PACKAGE_FILE,
  :zip_output => Constants::TEMP_PACKAGE_FILE,
  :verbose => false,
  :ignorefile => Constants::IGNORE_FILE,
  :ignoredir => Constants::IGNORE_DIR
}

def make_package(key_file, ext='crx')
  crxmake_hash = @crxmake_hash.dup
  crxmake_hash[:pkey] = key_file
  extension = CrxMake.new(crxmake_hash)
  if ext == 'crx'
    extension.make
  else
    extension.zip
  end
  extension_info = ExtensionInfo.new(extension.public_key, ".")
  dest = get_filename(extension_info, ext)
  FileUtils.mv(Constants::TEMP_PACKAGE_FILE, dest)
  puts "Package generated: #{dest}"
end

task :default => :'pack:default'

namespace :pack do
  desc 'pack extension using main key'
  task :default do
    make_package(Constants::KEY_FILE)
    make_package(Constants::KEY_FILE, 'zip')
  end

  desc 'pack extension using beta key'
  task :beta do
    make_package(Constants::BETA_KEY_FILE)
  end

  desc 'pack extension using a generated key'
  task :random do
    make_package(nil)
  end
end

desc 'generate zip file for extension gallery'
task :zip do
  make_package(Constants::KEY_FILE, 'zip')
end